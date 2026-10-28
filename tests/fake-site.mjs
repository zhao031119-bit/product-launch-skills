// Preload for the script tests: replaces fetch with an in-memory site, so the
// scripts run without the network. The site redirects with the reference
// canonicalRedirectTarget and follows every rule in seo-launch, except where
// FAKE_SITE (JSON) says otherwise:
//   www: true                 lives on www.example.com, not example.com
//   legacyPrefix: '/zh'       301s a retired path prefix to the clean URL
//   servesBothHosts: true     the www/bare twin answers 200 instead of a 301
//   trailingSlashStatus: 307  redirects a trailing slash with this status
//   rootWithoutSlash: true    lists the home page as https://example.com
//   sitemapIndex: true        /sitemap.xml is a sitemap index
//   duplicateCanonical: true  every page has a second canonical tag
//   robots: '...'             extra robots.txt lines
//   indexNowKey: '<hex>'      serves /<hex>.txt holding the key
// IndexNow submissions answer 202 and print "INDEXNOW <body>" to stderr.
import { canonicalRedirectTarget } from '../skills/seo-launch/references/canonical-url.ts';

const site = JSON.parse(process.env.FAKE_SITE || '{}');
const host = site.www ? 'www.example.com' : 'example.com';
const twin = site.www ? 'example.com' : 'www.example.com';
const origin = `https://${host}`;
const home = site.rootWithoutSlash ? origin : `${origin}/`;

const page = (canonical) =>
  `<!doctype html><html lang="en"><head><link rel="canonical" href="${canonical}">` +
  (site.duplicateCanonical ? `<link rel="canonical" href="${home}">` : '') +
  '</head><body>ok</body></html>';
const SITEMAP_NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const urlset =
  `<?xml version="1.0" encoding="UTF-8"?><urlset ${SITEMAP_NS}>` +
  `<url><loc>${home}</loc></url><url><loc>${origin}/pricing</loc></url></urlset>`;
const sitemapIndex =
  `<?xml version="1.0" encoding="UTF-8"?><sitemapindex ${SITEMAP_NS}>` +
  `<sitemap><loc>${origin}/sitemap-pages.xml</loc></sitemap></sitemapindex>`;
const robots = [
  'User-agent: *',
  'Allow: /',
  site.robots ?? '',
  `Sitemap: ${origin}/sitemap.xml`,
].join('\n');

const files = {
  '/robots.txt': ['text/plain', robots],
  '/sitemap.xml': [
    'application/xml',
    site.sitemapIndex ? sitemapIndex : urlset,
  ],
  '/sitemap-pages.xml': ['application/xml', urlset],
  '/': ['text/html', page(home)],
  '/pricing': ['text/html', page(`${origin}/pricing`)],
};
if (site.indexNowKey) {
  files[`/${site.indexNowKey}.txt`] = ['text/plain', site.indexNowKey];
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === 'api.indexnow.org') {
    console.error(`INDEXNOW ${init.body}`);
    return new Response(null, { status: 202 });
  }
  if (url.hostname !== host && url.hostname !== twin) {
    const cause = Object.assign(
      new Error(`getaddrinfo ENOTFOUND ${url.hostname}`),
      { code: 'ENOTFOUND' }
    );
    throw new TypeError('fetch failed', { cause });
  }
  const appHost = site.servesBothHosts && url.hostname === twin ? twin : host;
  const target = canonicalRedirectTarget(url.href, {
    appUrl: `https://${appHost}`,
    legacyPrefixes: site.legacyPrefix ? [site.legacyPrefix] : [],
  });
  if (target) {
    const slash = url.pathname.length > 1 && url.pathname.endsWith('/');
    const status = (slash && site.trailingSlashStatus) || 301;
    return new Response(null, { status, headers: { location: target } });
  }
  const file = files[url.pathname];
  if (!file) return new Response('not found', { status: 404 });
  return new Response(file[1], { headers: { 'content-type': file[0] } });
};
