#!/usr/bin/env node
/**
 * Post-build validation of dist/.
 *
 * Two things are checked, both of them failures that build cleanly and only
 * show up in a browser:
 *
 * 1. Internal links and assets resolve. Every href/src/action pointing inside
 *    the site must correspond to a real file in dist/.
 *
 * 2. The language switch is wired correctly. Base.astro takes a `self` prop —
 *    the page's path without the language prefix — and feeds it to both the
 *    hreflang alternates and the header's ES/EN switch. A page that forgets
 *    `self`, or passes the wrong value, silently sends visitors to the home
 *    page instead of the counterpart page. The invariant that catches it: the
 *    alternate for a page's OWN language must point back at that same page.
 *
 *    News detail pages are the deliberate exception. Their counterpart has a
 *    different slug per language, so they pass self="/news" and fall back to
 *    the newsroom index; for those we only require that the target exists.
 *
 * Placeholder links (href="#", action="#") are reported but do not fail the
 * build — they are tracked in the "Before going live" checklist in README.md.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, posix } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist');

if (!existsSync(dist)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(dist);
const pages = files.filter((f) => f.endsWith('.html'));

/** dist/es/team/index.html -> /es/team ; dist/index.html -> / */
function urlOf(file) {
  const rel = '/' + file.slice(dist.length + 1).split(/[\\/]/).join('/');
  return rel.replace(/\/index\.html$/, '') || '/';
}

/** Does an internal URL path resolve to something we actually built? */
function resolves(urlPath) {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  const base = join(dist, clean.replace(/^\//, ''));
  if (existsSync(base) && statSync(base).isFile()) return true;
  if (existsSync(join(base, 'index.html'))) return true;
  if (existsSync(`${base}.html`)) return true;
  return false;
}

const SKIP = /^(https?:|\/\/|mailto:|tel:|data:|javascript:)/i;
const ATTR = /(?:href|src|action)\s*=\s*"([^"]*)"/gi;

const errors = [];
const placeholders = [];
let linksChecked = 0;

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const pageUrl = urlOf(file);

  for (const [, raw] of html.matchAll(ATTR)) {
    const value = raw.trim();
    if (!value || SKIP.test(value)) continue;
    if (value === '#' || value.startsWith('#')) {
      if (value === '#') placeholders.push(pageUrl);
      continue;
    }
    const target = value.startsWith('/')
      ? value
      : posix.resolve(posix.dirname(pageUrl === '/' ? '/index' : `${pageUrl}/x`), value);
    linksChecked++;
    if (!resolves(target)) errors.push(`${pageUrl} -> ${value} (not found in dist)`);
  }

  // --- language-switch invariant ---
  const langMatch = html.match(/<html[^>]*\slang="([^"]+)"/i);
  const lang = langMatch?.[1];
  if (!lang || pageUrl === '/') continue;

  const alternates = [...html.matchAll(/<link[^>]*rel="alternate"[^>]*>/gi)].map((m) => m[0]);
  const selfAlt = alternates.find((tag) => tag.includes(`hreflang="${lang}"`));

  if (!selfAlt) {
    errors.push(`${pageUrl} has no hreflang="${lang}" alternate (missing self prop on Base?)`);
    continue;
  }

  const href = selfAlt.match(/href="([^"]*)"/)?.[1] ?? '';
  const isNewsDetail = /^\/[a-z]{2}\/news\/[^/]+$/.test(pageUrl);

  if (!resolves(href)) {
    errors.push(`${pageUrl} hreflang="${lang}" -> ${href} (not found in dist)`);
  } else if (!isNewsDetail && href.replace(/\/$/, '') !== pageUrl.replace(/\/$/, '')) {
    errors.push(
      `${pageUrl} hreflang="${lang}" points at ${href} — wrong or missing \`self\` prop, ` +
        `so the ES/EN switch will drop visitors on the wrong page`
    );
  }
}

if (placeholders.length) {
  const unique = [...new Set(placeholders)];
  console.log(
    `note: ${placeholders.length} placeholder href/action="#" on ${unique.length} page(s) ` +
      `— tracked in the "Before going live" checklist, not a build failure`
  );
}

if (errors.length) {
  console.error(`\nlink check: ${errors.length} problem(s)\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(
  `link check: OK (${pages.length} pages, ${linksChecked} internal links, ` +
    `language switch verified on every page)`
);
