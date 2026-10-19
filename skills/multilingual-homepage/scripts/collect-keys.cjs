// Collect the message keys used by the files reachable from some entry files
// (following imports), so only what a page really shows gets translated.
//
// Usage: node collect-keys.cjs <projectRoot> <messages/en.json> <out.json> <entry file>...
// Example: node collect-keys.cjs . messages/en.json en-home.json src/routes/index.tsx src/routes/__root.tsx
//
// Assumes the "@/..." import alias points at <projectRoot>/src (edit ALIAS_DIR otherwise).
const fs = require('fs');
const path = require('path');

const ALIAS_DIR = 'src';
// Server-only or primitive folders that never render page text.
const SKIP = /^@\/(paraglide|modules|server|components\/ui|core\/db|core\/payment|core\/ai|core\/storage|core\/email)\b/;

const [root, messagesFile, outFile, ...entries] = process.argv.slice(2);
if (!root || !messagesFile || !outFile || entries.length === 0) {
  console.error('usage: node collect-keys.cjs <projectRoot> <messages/en.json> <out.json> <entry file>...');
  process.exit(2);
}
const messages = JSON.parse(fs.readFileSync(path.resolve(root, messagesFile), 'utf8'));
const keys = new Set(Object.keys(messages).filter((k) => k !== '$schema'));

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('@/')) {
    if (SKIP.test(spec)) return null;
    base = path.join(root, ALIAS_DIR, spec.slice(2));
  } else if (spec.startsWith('.')) {
    base = path.resolve(path.dirname(from), spec);
  } else return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const seen = new Set();
const queue = entries.map((entry) => path.resolve(root, entry));
const used = new Set();
while (queue.length) {
  const file = queue.shift();
  if (seen.has(file)) continue;
  seen.add(file);
  const src = fs.readFileSync(file, 'utf8');
  for (const [, spec] of src.matchAll(/(?:from\s+|import\(\s*)['"]([^'"]+)['"]/g)) {
    const next = resolveImport(file, spec);
    if (next && !/\.test\./.test(next) && !next.includes(`${path.sep}api${path.sep}`)) queue.push(next);
  }
  // Static keys: any quoted string that is a known key.
  for (const [, key] of src.matchAll(/['"`]([a-z0-9_]+(?:\.[A-Za-z0-9_]+)+)['"`]/g)) if (keys.has(key)) used.add(key);
  // Template keys such as `millionaire.steps.${n}.title`.
  for (const [, tpl] of src.matchAll(/`([a-z0-9_.]*\$\{[^`]+)`/g)) {
    const re = new RegExp(`^${tpl.split(/\$\{[^}]+\}/).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[A-Za-z0-9_]+')}$`);
    for (const key of keys) if (re.test(key)) used.add(key);
  }
}

const subset = Object.fromEntries([...used].sort().map((key) => [key, messages[key]]));
fs.writeFileSync(outFile, `${JSON.stringify(subset, null, 2)}\n`);
console.log(`files: ${seen.size}, keys: ${used.size}, characters: ${Object.values(subset).join('').length} -> ${outFile}`);
