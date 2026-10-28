import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(
  new URL('../skills/seo-launch/scripts/indexnow.mjs', import.meta.url)
);
const fakeSite = new URL('./fake-site.mjs', import.meta.url).href;
const KEY = '0123456789abcdef0123456789abcdef';
const PAGES = ['https://example.com/', 'https://example.com/pricing'];

const scratch = mkdtempSync(join(tmpdir(), 'indexnow-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

/** A project folder whose public/ holds the key file. */
function project(name) {
  const root = join(scratch, name);
  mkdirSync(join(root, 'public'), { recursive: true });
  writeFileSync(join(root, 'public', `${KEY}.txt`), KEY);
  return root;
}

/** Run indexnow from cwd against a fake site; return what it submitted. */
function indexNow(cwd, options, ...args) {
  const run = spawnSync(
    process.execPath,
    ['--import', fakeSite, script, 'https://example.com', ...args],
    {
      cwd,
      encoding: 'utf8',
      env: {
        ...process.env,
        FAKE_SITE: JSON.stringify({ indexNowKey: KEY, ...options }),
      },
    }
  );
  const sent = run.stderr.match(/^INDEXNOW (.*)$/m);
  return {
    code: run.status,
    output: run.stdout + run.stderr,
    body: sent && JSON.parse(sent[1]),
  };
}

test('submits every sitemap page, with the key from ./public', () => {
  const result = indexNow(project('plain'), {});
  assert.equal(result.code, 0, result.output);
  assert.deepEqual(result.body.urlList, PAGES);
  assert.equal(result.body.key, KEY);
  assert.equal(result.body.keyLocation, `https://example.com/${KEY}.txt`);
});

test('a sitemap index is read through to its pages', () => {
  const result = indexNow(project('index'), { sitemapIndex: true });
  assert.equal(result.code, 0, result.output);
  assert.deepEqual(result.body.urlList, PAGES);
});

test('the public folder can be passed in from anywhere', () => {
  const result = indexNow(scratch, {}, join(project('elsewhere'), 'public'));
  assert.equal(result.code, 0, result.output);
});

test('without a public folder it says what to do, not a stack trace', () => {
  const empty = join(scratch, 'empty');
  mkdirSync(empty);
  const result = indexNow(empty, {});
  assert.equal(result.code, 1);
  assert.match(result.output, /run this from the project root/);
  assert.doesNotMatch(result.output, /\n\s+at /);
});
