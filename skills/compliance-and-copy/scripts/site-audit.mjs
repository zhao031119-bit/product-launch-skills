// Audit a live site the way a payment-provider reviewer looks at it, before
// launch:
// - the home page links the five legal pages (privacy, terms, cookies,
//   refund, acceptable use), and each of them answers 200
// - a contact email is on the home page or one of the legal pages
// - the home page, the pricing page and each --page carry no banned words;
//   every "free", "unlimited", "instant", "guaranteed" or "100%" on them is
//   listed for a person to confirm (a warning, not a failure)
// - with --webhook, the payment callback URL takes an unsigned POST without a
//   redirect and rejects it with a 4xx (providers count a 3xx as a failed
//   delivery)
//
// Usage: node scripts/site-audit.mjs https://your-domain
//          [--webhook=/api/payment/notify] [--page=/features] [--banned=word,word]
// --page and --banned can be given more than once.

const NAMES = ['webhook', 'page', 'banned'];
const args = process.argv.slice(2);
const flags = args.filter((arg) => arg.startsWith('--'));
const values = (name) =>
  flags
    .filter((flag) => flag.startsWith(`--${name}=`))
    .map((flag) => flag.slice(name.length + 3));
const [siteArg = ''] = args.filter((arg) => !arg.startsWith('--'));
const site = siteArg.replace(/\/+$/, '');
if (
  !/^https?:\/\/[^/]+$/.test(site) ||
  !flags.every((flag) => NAMES.some((name) => flag.startsWith(`--${name}=`)))
) {
  console.error(
    'usage: node scripts/site-audit.mjs https://your-domain [--webhook=/path] [--page=/path] [--banned=word,word]'
  );
  process.exit(1);
}
const [webhook] = values('webhook');
const extraPages = values('page');
const extraBanned = values('banned')
  .flatMap((list) => list.split(','))
  .map((word) => word.trim())
  .filter(Boolean);

let problems = 0;
const ok = (message) => console.log(`ok    ${message}`);
const warn = (message) => console.log(`warn  ${message}`);
const bad = (message) => {
  problems += 1;
  console.log(`FAIL  ${message}`);
};

async function check(label, run) {
  try {
    await run();
  } catch (error) {
    bad(`${label}: ${error.cause?.code || error.message}`);
  }
}

function finish() {
  console.log(
    problems
      ? `\n${problems} problem(s). Fix them before launch.`
      : '\nAll clear.'
  );
  process.exit(problems ? 1 : 0);
}

/** A page as a visitor ends up on it (redirects followed). */
async function fetchPage(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: { 'user-agent': `site-audit (+${site})` },
  });
  return { url: res.url || url, status: res.status, html: await res.text() };
}

const decode = (text) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(code))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

/** Visible text: no scripts, styles or tags, whitespace collapsed. */
const textOf = (html) =>
  decode(
    html
      .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();

/** The content of the first <meta> whose name or property is `key`. */
function metaContent(html, key) {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const name = tag.match(/\b(?:name|property)=["']?([^"'\s>]+)/i)?.[1];
    if (name?.toLowerCase() !== key) continue;
    const content = tag.match(/\bcontent=(?:"([^"]*)"|'([^']*)')/i);
    return decode(content?.[1] ?? content?.[2] ?? '');
  }
  return null;
}

/** Every <a href> on a page, resolved against it, with the link text. */
function linksOf(html, base) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].flatMap(
    ([, attributes, inner]) => {
      const href = attributes.match(
        /\bhref=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
      );
      const value = decode(href?.[1] ?? href?.[2] ?? href?.[3] ?? '').trim();
      if (!value || /^(#|javascript:|mailto:|tel:)/i.test(value)) return [];
      try {
        return [{ url: new URL(value, base), text: textOf(inner) }];
      } catch {
        return [];
      }
    }
  );
}

const LEGAL = [
  ['privacy policy', /privacy/i],
  ['terms of service', /terms|\btos\b/i],
  ['cookie policy', /cookie/i],
  ['refund policy', /refund/i],
  ['acceptable use policy', /acceptable[\s_-]?use|\baup\b/i],
];
const BANNED = new RegExp(
  String.raw`\b(?:${[
    String.raw`face[\s-]?swaps?`,
    String.raw`deep[\s-]?fakes?`,
    String.raw`celebrit(?:y|ies)`,
    ...extraBanned.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  ].join('|')})\b`,
  'gi'
);
const CLAIMS = /\b(?:free|unlimited|instant(?:ly)?|guaranteed?)\b|\b100 ?%/gi;

/** Each claim word on a page, how often, and one place it is used. */
function claimsIn(text) {
  const found = new Map();
  for (const match of text.matchAll(CLAIMS)) {
    const claim = match[0].toLowerCase().replace(/\s/g, '');
    const seen = found.get(claim);
    if (seen) seen.count += 1;
    else {
      const from = Math.max(0, match.index - 40);
      const to = match.index + match[0].length + 40;
      found.set(claim, { count: 1, sample: text.slice(from, to).trim() });
    }
  }
  return found;
}

// 1. the home page
const home = await fetchPage(`${site}/`).catch((error) => {
  bad(`home page: ${error.cause?.code || error.message}`);
  return null;
});
if (home && home.status !== 200) bad(`home page: HTTP ${home.status}`);
if (!home || home.status !== 200) finish();
const links = linksOf(home.html, home.url);
const linkMatching = (pattern) =>
  links.find(({ url, text }) => pattern.test(`${url.pathname} ${text}`));

// 2. the five legal pages, linked from the home page
const legalPages = [];
for (const [name, pattern] of LEGAL) {
  await check(name, async () => {
    const link = linkMatching(pattern);
    if (!link) return bad(`no link to the ${name} on the home page`);
    const legal = await fetchPage(link.url.href);
    if (legal.status !== 200)
      return bad(`${name}: ${link.url.href} answers HTTP ${legal.status}`);
    legalPages.push(legal);
    ok(`${name}  ${link.url.href}`);
  });
}

// 3. a contact email
const hasEmail = (html) =>
  /\bhref=["']?mailto:/i.test(html) ||
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/i.test(textOf(html));
if ([home, ...legalPages].some(({ html }) => hasEmail(html)))
  ok('contact email');
else
  bad(
    'no contact email on the home page or the legal pages (payment reviews look for one)'
  );

// 4. the words on the home page, the pricing page and each --page
const pricing = linkMatching(/pricing|plans/i);
if (!pricing)
  warn('no pricing link on the home page (payment reviews look for prices)');
const pages = [home];
for (const url of [
  ...(pricing ? [pricing.url.href] : []),
  ...extraPages.map((path) => new URL(path, `${site}/`).href),
]) {
  if (pages.some((page) => page.url === url)) continue;
  await check(url, async () => {
    const page = await fetchPage(url);
    if (page.status !== 200) return bad(`${url}: HTTP ${page.status}`);
    pages.push(page);
  });
}
for (const page of pages) {
  const label = new URL(page.url).pathname;
  const text = `${textOf(page.html)} ${metaContent(page.html, 'description') ?? ''}`;
  const banned = [
    ...new Set([...text.matchAll(BANNED)].map(([word]) => word.toLowerCase())),
  ];
  if (banned.length) bad(`${label}: banned words: ${banned.join(', ')}`);
  else ok(`${label}: no banned words`);
  for (const [claim, { count, sample }] of claimsIn(text))
    warn(`${label}: "${claim}" x${count}, confirm it is true: "…${sample}…"`);
}

// 5. the payment callback takes a POST where it stands, and wants a signature
if (webhook) {
  const url = new URL(webhook, `${site}/`).href;
  await check(`webhook ${url}`, async () => {
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    await res.body?.cancel();
    const { status } = res;
    if (status >= 300 && status < 400)
      return bad(
        `webhook ${url}: HTTP ${status} -> ${res.headers.get('location')}; providers count a redirect as a failed delivery`
      );
    if (status === 404 || status === 405)
      return bad(`webhook ${url}: HTTP ${status}, no callback there`);
    if (status < 300)
      return warn(
        `webhook ${url}: HTTP ${status} to an unsigned, empty POST; make sure it verifies the signature`
      );
    if (status >= 500)
      return warn(
        `webhook ${url}: HTTP ${status} to an unsigned, empty POST; it should reject it with a 4xx`
      );
    ok(`webhook ${url}: HTTP ${status} to an unsigned POST, no redirect`);
  });
}

finish();
