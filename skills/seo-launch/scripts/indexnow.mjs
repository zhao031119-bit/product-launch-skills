// Submit every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam,
// Naver …), so new pages get crawled within hours instead of days.
//
// Usage, after a deploy, from the project root:
//   node scripts/indexnow.mjs https://your-domain [public-dir]
// The key file <32 hex chars>.txt is read from public-dir (default ./public).
//
// The key is public by design: IndexNow checks that <site>/<key>.txt holds it.
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const KEY_FILE = /^[a-f0-9]{32}\.txt$/;

const site = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\/[^/]+$/.test(site)) {
  console.error(
    'usage: node scripts/indexnow.mjs https://your-domain [public-dir]'
  );
  process.exit(1);
}

const publicDir = resolve(process.argv[3] || 'public');
let keyFile;
try {
  keyFile = readdirSync(publicDir).find((f) => KEY_FILE.test(f));
} catch {
  console.error(
    `cannot read ${publicDir}: run this from the project root, or pass the folder that holds the key file`
  );
  process.exit(1);
}
if (!keyFile) {
  console.error(`no IndexNow key file in ${publicDir} (<32 hex chars>.txt)`);
  process.exit(1);
}
const key = keyFile.slice(0, -'.txt'.length);
const keyLocation = `${site}/${keyFile}`;

// IndexNow rejects a key it cannot read from the site itself.
const live = await fetch(keyLocation);
if (!live.ok || (await live.text()).trim() !== key) {
  console.error(`key file is not live at ${keyLocation} (HTTP ${live.status})`);
  process.exit(1);
}

const decode = (text) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
const locsIn = (xml) =>
  [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) =>
    decode(match[1])
  );
const fetchText = async (url) => (await fetch(url)).text();

const sitemap = await fetchText(`${site}/sitemap.xml`);
// A sitemap index lists sitemaps, not pages: read each of them.
const pages = /<sitemapindex\b/i.test(sitemap)
  ? (await Promise.all(locsIn(sitemap).map(fetchText))).flatMap(locsIn)
  : locsIn(sitemap);
const urlList = [...new Set(pages)];
if (urlList.length === 0) {
  console.error('no <loc> URLs found in the sitemap');
  process.exit(1);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(site).host, key, keyLocation, urlList }),
});
console.log(`IndexNow: HTTP ${res.status} for ${urlList.length} URLs`);
if (res.status >= 400) {
  console.error(await res.text());
  process.exit(1);
}
