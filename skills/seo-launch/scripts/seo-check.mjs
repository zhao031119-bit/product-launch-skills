// Check the site the way a search engine crawls it, before submitting the
// sitemap. Google indexes a sitemap URL only when it answers 200 itself: one
// that redirects is reported as "Page with redirect" and left out.
//
// What it checks:
// - robots.txt names <site>/sitemap.xml and does not shut out all crawlers,
//   or the search and AI crawlers that seo-launch lets in
// - the sitemap answers 200 as XML (a sitemap index is followed to its
//   sitemaps)
// - every sitemap URL and hreflang target answers 200 (no redirect), with
//   itself as the only canonical and no noindex
// - every other address of a page (http://, the www or bare host the site
//   does not use, a trailing slash, each --legacy-prefix) is a permanent 301
//   straight to the clean URL
// - an unknown page answers 404, not a 200 "soft 404"
// Warnings only (they do not block "All clear"): each sitemap page has a
// title within 60 characters, a description within 160, <html lang> and
// og:title / og:description / og:image; /llms.txt answers 200.
//
// Usage after a deploy:   node scripts/seo-check.mjs https://your-domain
// Against the dev server: node scripts/seo-check.mjs http://localhost:3000
// Add --legacy-prefix=/zh (once per prefix) when an old path prefix should
// 301 to the clean URL.

const args = process.argv.slice(2);
const flags = args.filter((arg) => arg.startsWith('--'));
const [siteArg = ''] = args.filter((arg) => !arg.startsWith('--'));
const site = siteArg.replace(/\/+$/, '');
const legacyPrefixes = flags
  .filter((flag) => flag.startsWith('--legacy-prefix='))
  .map((flag) => flag.slice('--legacy-prefix='.length).replace(/\/+$/, ''));
if (
  !/^https?:\/\/[^/]+$/.test(site) ||
  legacyPrefixes.length !== flags.length ||
  !legacyPrefixes.every((prefix) => /^\/[^/]/.test(prefix))
) {
  console.error(
    'usage: node scripts/seo-check.mjs https://your-domain [--legacy-prefix=/old ...]'
  );
  process.exit(1);
}
const origin = new URL(site);
let problems = 0;
const ok = (message) => console.log(`ok    ${message}`);
const warn = (message) => console.log(`warn  ${message}`);
const bad = (message) => {
  problems += 1;
  console.log(`FAIL  ${message}`);
};

/** One request with redirects NOT followed: the status is what we check. */
function get(url) {
  return fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
    headers: { 'user-agent': `seo-check (+${site})` },
  });
}

/** Follow redirects by hand (at most 5) so every hop's status is visible. */
async function trace(url) {
  const hops = [];
  let next = url;
  for (let i = 0; i <= 5; i += 1) {
    const res = await get(next);
    const location = res.headers.get('location');
    hops.push({ url: next, status: res.status });
    await res.body?.cancel();
    if (res.status < 300 || res.status >= 400 || !location) return hops;
    next = new URL(location, next).href;
  }
  return null;
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
    .replace(/&amp;/g, '&');

/** The URL in normal form (https://x.com is https://x.com/), or null. */
function normalize(url) {
  try {
    return new URL(url).href;
  } catch {
    return null;
  }
}

function canonicalsOf(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .filter((tag) => /\brel=["']?canonical\b/i.test(tag))
    .map((tag) => decode(tag.match(/\bhref=["']([^"']*)["']/i)?.[1] ?? ''));
}

function isNoindex(html, res) {
  if (/noindex/i.test(res.headers.get('x-robots-tag') ?? '')) return true;
  return [...html.matchAll(/<meta\b[^>]*>/gi)].some(
    ([tag]) =>
      /\bname=["']?(robots|googlebot|bingbot)\b/i.test(tag) &&
      /noindex/i.test(tag)
  );
}

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

/** What search results and share cards show; problems here do not block. */
function pageWarnings(html) {
  const warnings = [];
  const title = html.match(/<title\b[^>]*>([^<]*)<\/title>/i)?.[1];
  const titleText = decode(title ?? '').trim();
  if (!titleText) warnings.push('no <title>');
  else if (titleText.length > 60)
    warnings.push(`title is ${titleText.length} characters, keep it within 60`);
  const description = metaContent(html, 'description')?.trim();
  if (!description) warnings.push('no meta description');
  else if (description.length > 160)
    warnings.push(
      `description is ${description.length} characters, keep it within 160`
    );
  if (!/<html\b[^>]*\blang=["']?[a-z]/i.test(html))
    warnings.push('no <html lang>');
  const missingOg = ['og:title', 'og:description', 'og:image'].filter(
    (key) => !metaContent(html, key)
  );
  if (missingOg.length) warnings.push(`missing ${missingOg.join(', ')}`);
  return warnings;
}

async function check(label, run) {
  try {
    await run();
  } catch (error) {
    bad(`${label}: ${error.cause?.code || error.message}`);
  }
}

// "*" and the search and AI crawlers that seo-launch lets in.
const CRAWLERS = [
  '*',
  'googlebot',
  'bingbot',
  'oai-searchbot',
  'chatgpt-user',
  'gptbot',
  'perplexitybot',
  'claudebot',
];

/** robots.txt as [field, value] pairs: field lowercased, comments dropped. */
function robotsRules(text) {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/#.*/, '').match(/^\s*([a-z-]+)\s*:\s*(.*?)\s*$/i)
    )
    .filter(Boolean)
    .map(([, field, value]) => [field.toLowerCase(), value]);
}

/** The user-agents whose group disallows the whole site. */
function shutOut(rules) {
  const agents = [];
  let group = [];
  let groupHasRules = false;
  for (const [field, value] of rules) {
    if (field === 'user-agent') {
      // A user-agent line after rules starts the next group.
      if (groupHasRules) {
        group = [];
        groupHasRules = false;
      }
      group.push(value.toLowerCase());
    } else if (field === 'allow' || field === 'disallow') {
      groupHasRules = true;
      if (field === 'disallow' && (value === '/' || value === '/*'))
        agents.push(...group);
    }
  }
  return agents;
}

// 1. robots.txt
await check('robots.txt', async () => {
  const res = await get(`${site}/robots.txt`);
  const rules = robotsRules(await res.text());
  if (res.status !== 200) return bad(`robots.txt: HTTP ${res.status}`);
  const namesSitemap = rules.some(
    ([field, value]) => field === 'sitemap' && value === `${site}/sitemap.xml`
  );
  const blocked = [...new Set(shutOut(rules))].filter((agent) =>
    CRAWLERS.includes(agent)
  );
  if (!namesSitemap) bad(`robots.txt: no "Sitemap: ${site}/sitemap.xml" line`);
  if (blocked.length)
    bad(`robots.txt: "Disallow: /" for ${blocked.join(', ')}`);
  if (namesSitemap && !blocked.length)
    ok('robots.txt names the sitemap and lets crawlers in');
});

const LOC = /<loc>\s*([^<]+?)\s*<\/loc>/g;
const HREFLANG = /<xhtml:link\b[^>]*\bhref="([^"]+)"/g;
const matches = (xml, pattern) =>
  [...xml.matchAll(pattern)].map((match) => decode(match[1]));

/** A sitemap's XML; nothing (after reporting why) unless it is 200 XML. */
async function readSitemap(url) {
  const res = await get(url);
  const type = res.headers.get('content-type') ?? '';
  const xml = await res.text();
  if (res.status !== 200) return bad(`${url}: HTTP ${res.status}`);
  if (!/xml/i.test(type)) return bad(`${url}: served as "${type}", not XML`);
  return xml;
}

// 2. the sitemap itself; a sitemap index is followed to its sitemaps
let locs = [];
let alternates = [];
await check('sitemap.xml', async () => {
  const xml = await readSitemap(`${site}/sitemap.xml`);
  if (xml === undefined) return;
  let files = [xml];
  if (/<sitemapindex\b/i.test(xml)) {
    const children = matches(xml, LOC);
    ok(`sitemap.xml: index of ${children.length} sitemaps`);
    files = [];
    for (const child of children) {
      const childXml = await readSitemap(child);
      if (childXml !== undefined) files.push(childXml);
    }
  }
  locs = [...new Set(files.flatMap((file) => matches(file, LOC)))];
  alternates = [...new Set(files.flatMap((file) => matches(file, HREFLANG)))];
  if (locs.length === 0) return bad('sitemap.xml: no <loc> URLs');
  ok(`sitemap.xml: ${locs.length} URLs`);
});

// 3. every sitemap URL answers 200 itself and names itself as canonical
for (const loc of locs) {
  await check(loc, async () => {
    if (new URL(loc).origin !== origin.origin)
      return bad(`${loc}: not on ${site} (http/www mismatch)`);
    const res = await get(loc);
    if (res.status !== 200) {
      await res.body?.cancel();
      const to = res.headers.get('location');
      return bad(`${loc}: HTTP ${res.status}${to ? ` -> ${to}` : ''}`);
    }
    const html = await res.text();
    const canonicals = canonicalsOf(html);
    if (canonicals.length !== 1)
      bad(`${loc}: ${canonicals.length} canonical tags`);
    else if (normalize(canonicals[0]) !== normalize(loc))
      bad(`${loc}: canonical is ${canonicals[0]}`);
    else if (isNoindex(html, res)) bad(`${loc}: noindex`);
    else ok(`200, self-canonical  ${loc}`);
    for (const warning of pageWarnings(html)) warn(`${loc}: ${warning}`);
  });
}

// 4. hreflang targets that are not sitemap URLs themselves
const listed = new Set(locs.map(normalize));
for (const href of alternates.filter((url) => !listed.has(normalize(url)))) {
  await check(href, async () => {
    const res = await get(href);
    await res.body?.cancel();
    if (res.status === 200) ok(`200, hreflang target  ${href}`);
    else bad(`hreflang target ${href}: HTTP ${res.status}`);
  });
}

// 5. other addresses of the same page: one permanent hop to the clean URL
const page =
  locs
    .map(normalize)
    .filter(Boolean)
    .map((url) => new URL(url).pathname)
    .find((path) => path !== '/') ?? '/pricing';
const variants = [
  [`${site}${page}/`, `${site}${page}`],
  ...legacyPrefixes.map((prefix) => [
    `${site}${prefix}${page}`,
    `${site}${page}`,
  ]),
];
if (origin.protocol === 'https:') {
  const host = origin.host;
  // The same site under its other name: www.<domain> for a bare-domain site,
  // the bare domain for a www site.
  const twin = host.startsWith('www.') ? host.slice(4) : `www.${host}`;
  variants.push(
    [`http://${host}/`, `${site}/`],
    [`http://${host}${page}`, `${site}${page}`],
    [`https://${twin}/`, `${site}/`],
    [`https://${twin}/sitemap.xml`, `${site}/sitemap.xml`],
    [`http://${twin}${page}/?ref=x`, `${site}${page}?ref=x`]
  );
}
for (const [from, to] of variants) {
  await check(from, async () => {
    const hops = await trace(from);
    if (!hops) return bad(`${from}: more than 5 redirects`);
    const redirects = hops.slice(0, -1);
    const end = hops.at(-1);
    const chain = hops.map((hop) => hop.status).join(' -> ');
    if (redirects.length === 0)
      return bad(`${from}: HTTP ${end.status}, want a 301 to ${to}`);
    if (redirects.some((hop) => hop.status !== 301 && hop.status !== 308))
      return bad(`${from}: ${chain} (302/307 are temporary, want 301)`);
    if (end.url !== to || end.status !== 200)
      return bad(`${from}: ends at ${end.url} (HTTP ${end.status}), want ${to}`);
    if (redirects.length > 1)
      return warn(`${from} -> ${to} takes ${redirects.length} hops (${chain})`);
    ok(`301  ${from} -> ${to}`);
  });
}

// 6. a missing page is a real 404, not a 200 "soft 404" or a redirect home
await check('unknown page', async () => {
  const res = await get(`${site}/seo-check-no-such-page-${Date.now()}`);
  await res.body?.cancel();
  if (res.status === 404) ok('404  unknown page');
  else bad(`unknown page: HTTP ${res.status}, want 404`);
});

// 7. llms.txt, the page list for AI assistants (a warning, not a blocker)
await check('llms.txt', async () => {
  const res = await get(`${site}/llms.txt`);
  await res.body?.cancel();
  if (res.status === 200) ok('200  llms.txt');
  else warn(`llms.txt: HTTP ${res.status}, seo-launch lists one`);
});

console.log(
  problems
    ? `\n${problems} problem(s). Fix them before submitting the sitemap.`
    : '\nAll clear. Submit the sitemap.'
);
process.exit(problems ? 1 : 0);
