import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(
  new URL(
    '../skills/compliance-and-copy/scripts/site-audit.mjs',
    import.meta.url
  )
);
const fakeSite = new URL('./fake-site.mjs', import.meta.url).href;

/** Run site-audit against a fake site (options: see fake-site.mjs). */
function siteAudit(options, ...args) {
  const run = spawnSync(
    process.execPath,
    ['--import', fakeSite, script, 'https://example.com', ...args],
    {
      encoding: 'utf8',
      env: { ...process.env, FAKE_SITE: JSON.stringify(options) },
    }
  );
  const lines = run.stdout.split('\n');
  return {
    code: run.status,
    output: run.stdout + run.stderr,
    fails: lines.filter((line) => line.startsWith('FAIL')),
    warns: lines.filter((line) => line.startsWith('warn')),
  };
}

const has = (lines, text) => lines.some((line) => line.includes(text));

test('legal pages, a contact email and plain copy are all clear', () => {
  const result = siteAudit({}, '--webhook=/api/webhook');
  assert.equal(result.code, 0, result.output);
  assert.deepEqual(result.warns, []);
  assert.match(result.output, /All clear/);
});

test('a legal page missing from the footer fails', () => {
  const result = siteAudit({ missingLegal: ['refund'] });
  assert.ok(has(result.fails, 'no link to the refund policy'), result.output);
});

test('no contact email fails', () => {
  const result = siteAudit({ noContact: true });
  assert.ok(has(result.fails, 'no contact email'), result.output);
});

test('banned words fail; claims are listed for a person to confirm', () => {
  const banned = siteAudit({ bodyText: 'Make a deepfake of any celebrity.' });
  assert.ok(
    has(banned.fails, 'banned words: deepfake, celebrity'),
    banned.output
  );
  const claims = siteAudit({ bodyText: 'Start for free. Unlimited exports.' });
  assert.equal(claims.code, 0, claims.output);
  assert.ok(has(claims.warns, '"free" x1'), claims.output);
  assert.ok(has(claims.warns, '"unlimited" x1'), claims.output);
});

test('--banned adds words of your own', () => {
  const result = siteAudit(
    { bodyText: 'Better than Photoshop.' },
    '--banned=photoshop'
  );
  assert.ok(has(result.fails, 'banned words: photoshop'), result.output);
});

test('a webhook URL that redirects fails; one that skips the signature warns', () => {
  const www = siteAudit({}, '--webhook=https://www.example.com/api/webhook');
  assert.ok(has(www.fails, 'failed delivery'), www.output);
  const unsigned = siteAudit({ webhookStatus: 200 }, '--webhook=/api/webhook');
  assert.equal(unsigned.code, 0, unsigned.output);
  assert.ok(has(unsigned.warns, 'verifies the signature'), unsigned.output);
});

test('an unknown flag prints the usage', () => {
  const result = siteAudit({}, '--nope=1');
  assert.equal(result.code, 1);
  assert.match(result.output, /usage:/);
});
