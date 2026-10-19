// Check the site the way a search engine crawls it, before submitting the
// sitemap. Google indexes a sitemap URL only when it answers 200 itself: one
// that redirects is reported as "Page with redirect" and left out.
//
// What it checks:
// - robots.txt names <site>/sitemap.xml
// - the sitemap answers 200 as XML
// - every sitemap URL and hreflang target answers 200 (no redirect), with
//   itself as the only canonical and no noindex
// - every other address of a page (http://, www., a trailing slash, the old
//   /zh prefix) is a permanent 301 straight to the clean URL
// - an unknown page answers 404, not a 200 "soft 404"
//
// Usage after a deploy:   node scripts/seo-check.mjs https://your-domain
// Against the dev server: node scripts/seo-check.mjs http://localhost:3000

const site = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\/[^/]+$/.test(site)) {
  console.error('usage: node scripts/seo-check.mjs https://your-domain');
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
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

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

async function check(label, run) {
  try {
    await run();
  } catch (error) {
    bad(`${label}: ${error.cause?.code || error.message}`);
  }
}

// 1. robots.txt
await check('robots.txt', async () => {
  const res = await get(`${site}/robots.txt`);
  const lines = (await res.text()).split(/\r?\n/).map((line) => line.trim());
  if (res.status !== 200) bad(`robots.txt: HTTP ${res.status}`);
  else if (!lines.includes(`Sitemap: ${site}/sitemap.xml`))
    bad(`robots.txt: no "Sitemap: ${site}/sitemap.xml" line`);
  else if (lines.some((line) => /^disallow:\s*\/$/i.test(line)))
    bad('robots.txt: "Disallow: /" blocks the whole site');
  else ok('robots.txt names the sitemap');
});

// 2. the sitemap itself
let locs = [];
let alternates = [];
await check('sitemap.xml', async () => {
  const res = await get(`${site}/sitemap.xml`);
  const type = res.headers.get('content-type') ?? '';
  const xml = await res.text();
  if (res.status !== 200) return bad(`sitemap.xml: HTTP ${res.status}`);
  if (!/xml/i.test(type))
    return bad(`sitemap.xml: served as "${type}", not XML`);
  const unique = (matches) => [
    ...new Set([...matches].map((match) => decode(match[1]))),
  ];
  locs = unique(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g));
  alternates = unique(xml.matchAll(/<xhtml:link\b[^>]*\bhref="([^"]+)"/g));
  if (locs.length === 0) return bad('sitemap.xml: no <loc> URLs');
  ok(`sitemap.xml: 200 ${type}, ${locs.length} URLs`);
});

// 3. every sitemap URL answers 200 itself and names itself as canonical
for (const loc of locs) {
  await check(loc, async () => {
    if (!loc.startsWith(`${site}/`))
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
    else if (canonicals[0] !== loc)
      bad(`${loc}: canonical is ${canonicals[0]}`);
    else if (isNoindex(html, res)) bad(`${loc}: noindex`);
    else ok(`200, self-canonical  ${loc}`);
  });
}

// 4. hreflang targets that are not sitemap URLs themselves
for (const href of alternates.filter((url) => !locs.includes(url))) {
  await check(href, async () => {
    const res = await get(href);
    await res.body?.cancel();
    if (res.status === 200) ok(`200, hreflang target  ${href}`);
    else bad(`hreflang target ${href}: HTTP ${res.status}`);
  });
}

// 5. other addresses of the same page: one permanent hop to the clean URL
const page =
  locs.map((url) => new URL(url).pathname).find((path) => path !== '/') ??
  '/pricing';
const variants = [
  [`${site}${page}/`, `${site}${page}`],
  [`${site}/zh${page}`, `${site}${page}`],
];
if (origin.protocol === 'https:') {
  const host = origin.host;
  variants.push(
    [`http://${host}/`, `${site}/`],
    [`http://${host}${page}`, `${site}${page}`],
    [`https://www.${host}/`, `${site}/`],
    [`https://www.${host}/sitemap.xml`, `${site}/sitemap.xml`],
    [`http://www.${host}${page}/?ref=x`, `${site}${page}?ref=x`]
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

console.log(
  problems
    ? `\n${problems} problem(s). Fix them before submitting the sitemap.`
    : '\nAll clear. Submit the sitemap.'
);
process.exit(problems ? 1 : 0);
