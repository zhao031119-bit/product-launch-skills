// Submit every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam,
// Naver …), so new pages get crawled within hours instead of days.
//
// Usage, after a deploy:  node scripts/indexnow.mjs https://your-domain
//
// The key is public by design: IndexNow checks that <site>/<key>.txt holds it.
import { readdirSync } from 'node:fs';

const KEY_FILE = /^[a-f0-9]{32}\.txt$/;

const site = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\/[^/]+$/.test(site)) {
  console.error('usage: node scripts/indexnow.mjs https://your-domain');
  process.exit(1);
}

const keyFile = readdirSync(new URL('../public/', import.meta.url)).find((f) =>
  KEY_FILE.test(f)
);
if (!keyFile) {
  console.error('no IndexNow key file in public/ (<32 hex chars>.txt)');
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

const sitemap = await (await fetch(`${site}/sitemap.xml`)).text();
const urlList = [
  ...new Set(
    [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim())
  ),
];
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
