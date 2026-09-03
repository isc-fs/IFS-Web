<img width="470" alt="ISC Formula Student Racing Team" src="public/assets/logo-full-white.png" />

# IFS-Web

Public website for the **ISC Formula Student Racing Team** — Universidad Pontificia Comillas ICAI, Madrid. Five pages (home, team, competition, sponsors, newsroom), fully bilingual in Spanish and English, built as a static site with [Astro](https://astro.build).

Generated from the design mockup; every colour, type size and spacing value comes from the ISC design system.

---

## Getting started

Requires **Node 18.17+** (or 20+).

```bash
npm install
npm run dev      # http://localhost:4321 → redirects to /es/
npm run build    # static output in dist/
npm run preview  # serve the built site locally
npm run verify   # everything CI runs — do this before opening a PR
```

There is no database and no CMS. Everything is files.

### Checks

`npm run verify` chains the four checks that CI runs, cheapest first:

| Command | Catches |
|---|---|
| `npm run check:i18n` | drift between `es.json` and `en.json` — missing keys, type mismatches, arrays of different length, copy translated in one language and blank in the other |
| `npm run check` | `astro check` — TypeScript and Astro diagnostics |
| `npm run build` | build errors |
| `npm run check:links` | internal links or assets that 404, and pages whose ES/EN switch is mis-wired |

The two custom checks in `scripts/` exist because neither is reachable any other
way. `useTranslations()` casts its result `as Dictionary`, and that cast hides
every structural difference between the dictionaries from the type checker — a
key missing from `en.json` compiles cleanly and renders `undefined`. And a page
that passes the wrong `self` prop to `Base.astro` builds perfectly but sends
visitors to the home page when they switch language; `check:links` asserts that
each page's own-language `hreflang` alternate points back at that page.

Placeholder `href="#"` / `action="#"` links are reported but do not fail the
build — they are the open items in "Before going live" below.

---

## Project structure

```
public/
  assets/          photography, logo lockups, sponsorship dossiers (PDF)
  fonts/           self-hosted Jost + IBM Plex Sans/Mono (woff2, latin subset)
src/
  styles/
    tokens.css     ISC design tokens + .isc-dark / .isc-light grounds
    fonts.css      @font-face declarations
    global.css     resets and the design-system primitives (see below)
  i18n/
    es.json        all Spanish copy
    en.json        all English copy
    index.ts       useTranslations(), path(), navItems(), daysUntil()
  data/
    events.json    upcoming-events calendar with countdown dates
  content/
    config.ts      newsroom collection schema
    news/es/*.md   Spanish posts
    news/en/*.md   English posts
  components/      SiteHeader, Footer, PageHero, SectionHead, Stat
  layouts/
    Base.astro     <html>, head, header, footer
  pages/
    index.astro                 redirects to /es/
    [lang]/index.astro          home
    [lang]/team.astro           team
    [lang]/competition.astro    competition
    [lang]/sponsors.astro       sponsors
    [lang]/news/index.astro     newsroom
    [lang]/news/[slug].astro    single post
```

---

## Design system

`global.css` carries the design-system primitives as plain classes, so markup stays close to the brand spec:

| Class | Use |
|---|---|
| `.eyebrow` | tracked uppercase label above a heading |
| `.heading` + `.display-xl` / `.display-l` / `.display-m` / `.h1`–`.h4` | Jost SemiBold titles |
| `.rule` / `.rule-sm` / `.rule-lg` | the gold rule — marks where text begins, never full width |
| `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-green` / `.btn-ghost` (+ `.btn-sm` / `.btn-lg` / `.btn-block`) | buttons |
| `.badge` + `.badge-gold` / `.badge-green` / `.badge-outline` (+ `.badge-pill`) | status badges and chips |
| `.stat` / `.stat-value` / `.stat-label` | figures |
| `.table` (+ `td.num`) | spec tables |
| `.field` / `.label` / `.input` / `.help` | forms |
| `.mono` | IBM Plex Mono for data: dates, codes, point totals |
| `.wrap` / `.section` / `.prose` | layout containers |
| `.actions` | a row of buttons — wraps, gap and top margin already set |
| `.flush` / `.mb-3`–`.mb-7` / `.self-start` | the small utility layer (see below) |

**Breakpoints** — two, and only two. Custom properties cannot be used inside a
media query, so the values are written out and documented in `tokens.css`:

| | | |
|---|---|---|
| `sm` | 640px | single column, disclosure nav, mobile type step, 44px touch targets |
| `lg` | 1080px | multi-column grids collapse to two |

`SiteHeader` and `PageHero` additionally carry a 900px query for the header row
and hero padding.

**Utilities** — a deliberately tiny layer (`.flush`, `.mb-3`–`.mb-7`,
`.self-start`, `.actions`). Templates carried 59 inline `style=` attributes with
off-scale spacing and hardcoded `rgba` whites; these cover the recurring cases
so no template needs `style=` again. Anything page-specific still belongs in
that page's `*.module.css`. The one legitimate use of inline `style` is passing
a *dynamic value* as a custom property — a hero image URL, a card's column
span — never a finished declaration.

Grounds: put `.isc-dark` (racing green / ink, the default) or `.isc-light` (paper / cream) on any container. Components read only the contextual `--isc-c-*` variables, so grounds nest correctly at any depth.

Everything page-specific lives in a `*.module.css` next to its page or component. Square corners are the default — `--isc-radius-0`.

---

## Editing content

### Copy

All UI copy is in `src/i18n/es.json` and `src/i18n/en.json`, mirrored key for key. Keys are grouped by page: `nav`, `home`, `team`, `comp`, `spon`, `news`, `footer`. Add a key to both files or the type check will flag it.

### The team roster

`team.verticals` in each dictionary: five verticals, each with a `code`, `name`, `blurb`, `count` and a list of `depts` (`name` + `lead`). Leadership sits in `team.leads` and `team.techLeads`.

### Sponsors

`spon.tiers` in each dictionary — tier name, optional note and a list of brand
names. Artwork is mapped separately in `src/data/sponsors.json`, keyed by the
exact brand name used in the tier list:

```json
"Fundación Gestamp": { "file": "fundacion-gestamp.png", "treat": "forceWhite" }
```

Logos are not translatable, so they live there rather than being duplicated
across both dictionaries. A brand with no entry renders as text, which is how
sponsors who have not sent artwork still appear on the wall.

- `treat` — `forceWhite` flattens dark artwork to white; `knockout` removes a
  light background baked into the file. Omit it when the sponsor supplied a
  white lockup, which most did.
- `scale` — only for artwork delivered with wide transparent margins around the
  mark. Aspect ratio cannot detect that padding, so those files land far
  smaller than everything beside them.

Size is not set per logo. `src/lib/sponsorLogos.ts` reads each file's real
dimensions at build time and picks one of three caps from the aspect ratio, so
a 6:1 wordmark and a 1:1 mark carry similar optical weight. The `<img>` carries
no width or height, so it renders at its intrinsic size and the caps only ever
shrink it — a small bitmap is never enlarged and softened. Rasters additionally
get a hard ceiling at their own pixel width.

### Newsroom

One Markdown file per post, per language, in `src/content/news/<lang>/`. Frontmatter:

```yaml
---
title: "Headline"
date: 2026-08-18
category: "Competición"
kind: featured   # featured | card | brief
span: 3          # grid columns out of 6 (cards only)
excerpt: "One or two sentences for the card."
image: "/assets/car-cornering.jpg"
---

Body copy in Markdown.
```

- `kind: featured` — the big story at the top (most recent one wins)
- `kind: card` — grid entry; `span: 3` is a wide card, `span: 2` a standard one
- `kind: brief` — dated one-liner in the "In brief" list; no image or excerpt needed

Publishing is a pull request. Posts are sorted by `date`, newest first.

### Upcoming events

`src/data/events.json` — one entry per event with an ISO `date` and `es` / `en` labels. The countdown on the home page is computed at build time from `date`, so rebuild (or schedule a rebuild) to keep the day counts current.

---

## Bilingual routing

Spanish is the default. Route slugs are identical in both languages, only labels are translated:

```
/es/  /es/team  /es/competition  /es/sponsors  /es/news  /es/news/<slug>
/en/  /en/team  /en/competition  /en/sponsors  /en/news  /en/news/<slug>
```

`/` redirects to `/es/`. The header's ES/EN switch links to the same page in the other language via the `self` prop each page passes to `Base.astro` — keep that prop accurate when adding pages, or the switch will drop the visitor on the home page.

---

## Before going live

- [ ] Point the sponsorship form's `action` at a real handler (Formspree, Netlify Forms, an API route). It is currently `action="#"`.
- [ ] Replace `info@iscfsracing.es` and the social links in `footer.cols` with the real ones.
- [ ] Chase artwork for the sponsors still rendering as text, and better files
      for the five that needed compromises: Fundación Gestamp and Doroteo
      Olmedo sent dark artwork now flattened to white (a real white lockup
      would keep their brand colour), Valmoldes sent only a vertical lockup,
      A123 Systems and Colegio ICAI sent artwork with a white background baked
      in. Keyshot sent only `.eps`, which browsers cannot render.
- [ ] Replace the member portrait placeholders on the team page with the season photography.
- [ ] Add the extended-Latin font files if any copy needs characters outside the Latin subset.
- [ ] Decide whether the newsroom categories should become real filters. They
      are a static legend today; making them interactive needs either client JS
      (the site ships none) or `/news/[category]` routes.
- [ ] Set the production domain in `astro.config.mjs` (`site`).
- [ ] **Optimise the photography.** `public/assets` is ~90 MB of camera-original
      JPEGs — ten files at 6–10 MB each, shipped to visitors as-is. Resizing to
      ~2560 px and re-encoding (JPEG q80 + WebP) takes this under 5 MB with no
      visible loss. The CI job summary lists the ten largest files in every build.
- [ ] Choose hosting and add a deploy job to `.github/workflows/ci.yml`
      (`needs: build`, gated on `refs/heads/main`). CI builds and uploads the
      site as an artifact today, but nothing publishes it.

---

*ISC Racing Team — Formula Student*
