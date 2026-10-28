// Check an AI translation against its English source before merging it.
//
// Usage: node check-translation.cjs <source.json> <translated.json> <lang> [rules.json]
// Exit code 1 on any FAIL. WARN lines are for a human (or the translator) to review.
//
// rules.json (all optional):
// {
//   "keep": ["ChatGPT", "TikTok", "MP4", "9:16", "Get a job"],   // must survive verbatim when the source has them
//   "copyUnchangedPrefixes": ["settings.", "admin."],            // keys that stay in the source language
//   "banned": { "all": ["face[\\s-]?swap", "deep\\s?fake"], "es": ["celebridad"] },
//   "freeWords": { "es": "gratis", "de": "kostenlos|gratis|umsonst" }, // only where the source says "free"
//   "maxLength": { "landing.meta.title": 60, "landing.meta.description": 160 },
//   "shortLabel": { "maxSourceLength": 30, "ratio": 1.6, "slack": 12 }
// }
const fs = require('fs');

const [sourceFile, translatedFile, lang, rulesFile] = process.argv.slice(2);
if (!sourceFile || !translatedFile || !lang) {
  console.error('usage: node check-translation.cjs <source.json> <translated.json> <lang> [rules.json]');
  process.exit(2);
}
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const source = read(sourceFile);
const rules = rulesFile ? read(rulesFile) : {};
let translated;
try {
  translated = read(translatedFile);
} catch (error) {
  console.log(`FAIL cannot read ${translatedFile}: ${error.message}`);
  process.exit(1);
}

const keep = rules.keep || [];
const unchanged = rules.copyUnchangedPrefixes || [];
const banned = [...((rules.banned || {}).all || []), ...((rules.banned || {})[lang] || [])].map((p) => new RegExp(p, 'i'));
const free = (rules.freeWords || {})[lang] ? new RegExp((rules.freeWords || {})[lang], 'i') : null;
const maxLength = rules.maxLength || {};
const short = { maxSourceLength: 30, ratio: 1.6, slack: 12, ...(rules.shortLabel || {}) };

const fails = [];
const warns = [];
const placeholders = (s) => (s.match(/\{[^}]*\}/g) || []).sort().join(' ');

for (const key of Object.keys(source)) {
  if (key === '$schema') continue;
  const en = source[key];
  const tr = translated[key];
  if (!(key in translated)) { fails.push(`FAIL ${key}: missing`); continue; }
  if (typeof tr !== 'string' || !tr.trim()) { fails.push(`FAIL ${key}: empty`); continue; }
  if (placeholders(en) !== placeholders(tr)) fails.push(`FAIL ${key}: placeholders ${placeholders(tr) || '(none)'} != ${placeholders(en) || '(none)'}`);
  for (const re of banned) if (re.test(tr)) fails.push(`FAIL ${key}: banned ${re}`);
  if (free && free.test(tr) && !/\bfree\b/i.test(en)) fails.push(`FAIL ${key}: says "free" where the source does not`);
  for (const word of keep) if (en.includes(word) && !tr.includes(word)) fails.push(`FAIL ${key}: must keep "${word}"`);
  if (unchanged.some((p) => key.startsWith(p))) {
    if (tr !== en) fails.push(`FAIL ${key}: must stay unchanged`);
    continue;
  }
  if (maxLength[key] && tr.length > maxLength[key]) fails.push(`FAIL ${key}: ${tr.length} chars > ${maxLength[key]}`);
  if (tr === en && /[a-z]{3,}\s+[a-z]{3,}/i.test(en)) warns.push(`WARN ${key}: identical to source`);
  if (en.length <= short.maxSourceLength && tr.length > Math.max(en.length * short.ratio, en.length + short.slack)) {
    warns.push(`WARN ${key}: long for a short label (${tr.length} vs ${en.length}): "${tr}"`);
  }
}
for (const key of Object.keys(translated)) if (!(key in source)) fails.push(`FAIL ${key}: extra key`);

[...fails, ...warns].forEach((line) => console.log(line));
const total = Object.keys(source).filter((k) => k !== '$schema').length;
console.log(fails.length ? `${fails.length} FAIL, ${warns.length} WARN` : `PASS (${total} keys, ${warns.length} WARN)`);
process.exit(fails.length ? 1 : 0);
