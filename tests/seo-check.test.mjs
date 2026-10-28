import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(
  new URL('../skills/seo-launch/scripts/seo-check.mjs', import.meta.url)
);
const fakeSite = new URL('./fake-site.mjs', import.meta.url).href;

/** Run seo-check against a fake site (options: see fake-site.mjs). */
function seoCheck(options, ...args) {
  const site = options.www ? 'https://www.example.com' : 'https://example.com';
  const run = spawnSync(
    process.execPath,
    ['--import', fakeSite, script, site, ...args],
    {
      encoding: 'utf8',
      env: { ...process.env, FAKE_SITE: JSON.stringify(options) },
    }
  );
  return {
    code: run.status,
    output: run.stdout + run.stderr,
    fails: run.stdout.split('\n').filter((line) => line.startsWith('FAIL')),
  };
}

const failsOn = (result, text) =>
  result.fails.some((line) => line.includes(text));

test('a site that follows every rule is all clear', () => {
  const result = seoCheck({});
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /All clear/);
});

test('a retired prefix is checked only when passed in', () => {
  const zh = seoCheck({ legacyPrefix: '/zh' }, '--legacy-prefix=/zh');
  assert.equal(zh.code, 0, zh.output);
  const missing = seoCheck({}, '--legacy-prefix=/zh');
  assert.ok(failsOn(missing, '/zh/pricing: HTTP 404'), missing.output);
});

test('a www site is all clear, and its bare domain must 301 to www', () => {
  const www = seoCheck({ www: true });
  assert.equal(www.code, 0, www.output);
  const both = seoCheck({ www: true, servesBothHosts: true });
  assert.ok(
    failsOn(both, 'https://example.com/: HTTP 200, want a 301'),
    both.output
  );
});

test('a bare-domain site: www must 301 to the bare domain', () => {
  const result = seoCheck({ servesBothHosts: true });
  assert.ok(
    failsOn(result, 'https://www.example.com/: HTTP 200, want a 301'),
    result.output
  );
});

test('the home page may be listed without its trailing slash', () => {
  const result = seoCheck({ rootWithoutSlash: true });
  assert.equal(result.code, 0, result.output);
});

test('a sitemap index is followed to its pages', () => {
  const result = seoCheck({ sitemapIndex: true });
  assert.equal(result.code, 0, result.output);
  assert.match(
    result.output,
    /self-canonical {2}https:\/\/example\.com\/pricing/
  );
});

test('robots.txt: shutting out a search or AI crawler fails', () => {
  const other = seoCheck({ robots: 'User-agent: SemrushBot\nDisallow: /' });
  assert.equal(other.code, 0, other.output);
  const gpt = seoCheck({ robots: 'User-agent: GPTBot\nDisallow: /' });
  assert.ok(failsOn(gpt, '"Disallow: /" for gptbot'), gpt.output);
});

test('a temporary redirect for the trailing slash fails', () => {
  const result = seoCheck({ trailingSlashStatus: 307 });
  assert.ok(
    failsOn(result, '307 -> 200 (302/307 are temporary'),
    result.output
  );
});

test('two canonical tags fail', () => {
  const result = seoCheck({ duplicateCanonical: true });
  assert.ok(failsOn(result, '2 canonical tags'), result.output);
});

test('a malformed --legacy-prefix prints the usage', () => {
  const result = seoCheck({}, '--legacy-prefix=zh');
  assert.equal(result.code, 1);
  assert.match(result.output, /usage:/);
});
