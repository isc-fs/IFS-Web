# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The repo root holds only team process files (`README.md`, `ROADMAP.md`, `.github/`). **All application code lives in `code/`** — run every npm command from there.

Note: the root `README.md` is the ISC team's firmware repo template (it still says `IFSXX-[DPT]_[PCB/PURPOSE]` and talks about flashing firmware). The real project documentation is [code/README.md](code/README.md). The branch/issue/roadmap process in the root README does apply here.

## Commands

```bash
cd code
npm install
npm run dev      # http://localhost:4321 → / redirects to /es/
npm run build    # static output in code/dist/
npm run preview  # serve the built site
npm run verify   # everything CI runs — the gate before opening a PR
```

`npm run verify` = `check:i18n` → `check` (astro check) → `build` → `check:links`. Run individually when iterating. There is no test runner, linter, or formatter; these four checks are the whole gate, and CI runs exactly them.

The two scripts in `code/scripts/` cover failures nothing else can see:

- **`check-i18n.mjs`** — `useTranslations()` casts its result `as Dictionary`, and that cast suppresses every structural error TypeScript would raise. A key present in `es.json` and missing from `en.json` type-checks cleanly and renders `undefined`. Do not assume `astro check` covers dictionary drift; it cannot.
- **`check-links.mjs`** — resolves every internal link against `dist/`, and asserts each page's own-language `hreflang` alternate points back at that same page. That last invariant is what catches a wrong or missing `self` prop (see below). News detail pages are the deliberate exception: their counterpart has a different slug per language, so they fall back to the news index.

Requires Node 18.17+ (CI pins Node 20).

## Architecture

Astro 4, `output: 'static'`, no database, no CMS, no client-side framework. Everything is files.

**Bilingual routing.** Spanish is the default and route slugs are identical in both languages — only labels are translated. Every page under `src/pages/[lang]/` exports `getStaticPaths()` over `Object.keys(languages)` and reads `Astro.params.lang`. `src/pages/index.astro` is a meta-refresh redirect to `/es/`.

**`src/i18n/index.ts` is the routing + copy hub.** `useTranslations(lang)` returns the whole dictionary (typed as `typeof es`), `path(lang, to)` builds prefixed hrefs, `navItems()` produces the nav with `current` flags, `daysUntil()` computes countdowns **at build time** (so day counts go stale without a rebuild). All copy lives in `src/i18n/es.json` / `en.json`, mirrored key for key, grouped as `nav`, `home`, `team`, `comp`, `spon`, `news`, `footer` — including structured data like the team roster (`team.verticals`) and sponsor tiers (`spon.tiers`). Adding a page means adding keys to **both** files.

**`Base.astro` takes a `self` prop** — the page's path without the language prefix (e.g. `/team`). It drives both the `hreflang` alternates and the header's ES/EN switch. If `self` is wrong or missing on a new page, the language switch silently drops visitors on the home page.

**Content collection.** Newsroom posts are Markdown under `src/content/news/<lang>/`, one file per language. The collection is flat — `[slug].astro` splits `post.id` on `/` to recover the language, so the directory name *is* the language. Frontmatter schema is in `src/content/config.ts`; `kind` (`featured` | `card` | `brief`) plus `span` (grid columns out of 6) drive the newsroom layout, and the most recent `featured` post wins the hero slot.

## Styling system

Three layers, in this order (imported by `Base.astro`):

1. **`src/styles/tokens.css`** — brand constants and the ground system. Never redefine `--isc-green` (RAL 6005) or `--isc-gold` (RAL 1003).
2. **`src/styles/global.css`** — design-system primitives as plain global classes (`.heading`, `.display-xl`, `.rule`, `.btn-*`, `.badge-*`, `.stat`, `.table`, `.field`/`.input`, `.mono`, `.wrap`/`.section`/`.prose`). Use these in markup rather than reinventing them; the class table in [code/README.md](code/README.md) lists them all.
3. **`*.module.css`** — anything page- or component-specific, next to its component or under `src/styles/pages/`.

**The ground contract is the important part.** `.isc-dark` (default, on `<body>`) and `.isc-light` each define the full set of contextual `--isc-c-*` variables. Components must read **only** `--isc-c-*`, never `--isc-d-*` / `--isc-l-*` or a raw ramp colour — that's what lets grounds nest to any depth. Square corners are the default (`--isc-radius-0`).

A few pages still carry inline `style="..."` for one-off spacing (e.g. `[slug].astro`), including hardcoded `rgba(255,255,255,...)` text colours that assume a dark ground. Prefer tokens and module CSS for new work.

## CI

`.github/workflows/ci.yml` runs the `build` job on every PR into `dev` or `main` and every push to them: `npm ci` → the four checks above → uploads `code/dist` as an artifact and writes a page-count/size summary. It is the required status check on both protected branches.

**There is no deploy step.** Hosting has not been chosen, so CI builds and archives the site but nothing publishes it. Adding deployment means a job with `needs: build`, gated on `github.ref == 'refs/heads/main'`.

`.github/workflows/pr-hygiene.yml` enforces the branch rules mechanically: PRs into `main` may come only from `dev`, and PRs into `dev` must come from a `feat/<n>` or `fix/<n>` branch. Fork PRs are exempt.

## Branch and PR workflow

Enforced by GitHub Actions and branch protection, not by convention alone:

- Work happens on `feat/<n>` or `fix/<n>` branches cut from `dev` (independent counters). Never commit to `main` or `dev`.
- Pushing such a branch auto-opens a tracking issue titled `[feat/N] ...` via `.github/workflows/branch-issue.yml`; a wrong number produces a warning in the issue asking you to recreate the branch. The next number is the last closed issue of that type plus one.
- The first commit message auto-fills the issue description. PRs target `dev` and should say `Closes #<issue-number>`.
- `ROADMAP.md` is **generated** from `.github/roadmap.yaml` by `.github/scripts/render_roadmap.py` on every push to `dev`. Edit the YAML, never `ROADMAP.md`.

`main` and `dev` are both protected: linear history, no force-push, no deletion, PR required with 1 approval, and `build` + `branch-and-target` must pass. `dev` grants the GitHub Actions app a bypass so `roadmap.yml`'s auto-commit of `ROADMAP.md` can still push; without that bypass every merge into `dev` would end in a red X.

Still template placeholders: `.github/roadmap.yaml` holds a TODO phase, so `ROADMAP.md` renders a TODO roadmap until it is filled in.

## Known open items

`code/README.md` ends with a "Before going live" checklist — the sponsorship form still posts to `action="#"`, sponsor logos are text placeholders, and contact details in `footer.cols` are provisional. Check it before touching those areas.
