#!/usr/bin/env node
/**
 * Dictionary parity check for src/i18n/es.json and en.json.
 *
 * `astro check` cannot catch drift between the two dictionaries:
 * useTranslations() casts the looked-up dictionary `as Dictionary`, and that
 * cast suppresses every structural error TypeScript would otherwise raise.
 * So a key present in es.json and missing from en.json type-checks cleanly and
 * renders `undefined` on the English page. This script is the real gate.
 *
 * Errors on: keys present in one dictionary only, type mismatches, arrays of
 * differing length (the structured blocks — home.meta, team.verticals,
 * spon.tiers — are rendered with .map(), so a length mismatch means the two
 * languages render different pages), and half-translated copy — a string that
 * is blank in one language but filled in the other.
 *
 * A value blank in BOTH languages is deliberate: optional fields such as
 * spon.tiers[].note are rendered behind a `{tier.note && ...}` guard, and an
 * empty string is how the author says "no note on this tier".
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, '../src/i18n');

const load = (name) => JSON.parse(readFileSync(resolve(dir, name), 'utf8'));
const es = load('es.json');
const en = load('en.json');

const kindOf = (v) =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;

/** Flatten to a Map of dotted path -> kind, recursing through arrays too. */
function flatten(value, prefix = '', out = new Map()) {
  const kind = kindOf(value);
  out.set(prefix, kind);
  if (kind === 'object') {
    for (const [k, v] of Object.entries(value)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else if (kind === 'array') {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  }
  return out;
}

const flatEs = flatten(es);
const flatEn = flatten(en);

const errors = [];

for (const [path, kind] of flatEs) {
  if (!path) continue;
  if (!flatEn.has(path)) {
    errors.push(`missing in en.json: ${path}`);
  } else if (flatEn.get(path) !== kind) {
    errors.push(`type mismatch at ${path}: es=${kind} en=${flatEn.get(path)}`);
  }
}

for (const path of flatEn.keys()) {
  if (!path) continue;
  if (!flatEs.has(path)) errors.push(`missing in es.json: ${path}`);
}

/** Blank in one language but filled in the other = an unfinished translation. */
const at = (root, path) =>
  path
    .split(/\.|\[|\]/)
    .filter(Boolean)
    .reduce((acc, k) => (acc == null ? acc : acc[k]), root);

for (const [path, kind] of flatEs) {
  if (kind !== 'string' || !path || flatEn.get(path) !== 'string') continue;
  const a = String(at(es, path)).trim();
  const b = String(at(en, path)).trim();
  if (a === '' && b !== '') errors.push(`blank in es.json but translated in en.json: ${path}`);
  if (b === '' && a !== '') errors.push(`blank in en.json but translated in es.json: ${path}`);
}

if (errors.length) {
  console.error(`i18n parity: ${errors.length} problem(s)\n`);
  for (const e of errors.sort()) console.error(`  ${e}`);
  console.error('\nes.json and en.json must mirror each other key for key.');
  process.exit(1);
}

console.log(`i18n parity: OK (${flatEs.size} paths mirrored across es/en)`);
