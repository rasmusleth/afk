# Preview sports data on the website

The sports pages are `/kampe/`, `/stilling/` and `/spillere/`. The homepage at `/`
combines editorial content with a selected competition summary; see the
[homepage guide](homepage.md).
It reads saved records, not DBU pages. Import using [DBU → Sanity](sports-data.md).
All commands below run from the repository root.

## Use development Sanity data

The development dataset must already allow unauthenticated reads. The website
has no token support. If the dataset is private, a server-side read/export setup
needs a separate decision; use the offline preview meanwhile.

```sh
AFK_SPORTS_PROJECT_ID=YOUR_PROJECT_ID \
  AFK_SPORTS_DATASET=development \
  AFK_SPORTS_NATIONAL_MEN_COMPETITIONS=YOUR_COMPETITION_ID pnpm dev
```

These public settings may instead go in `apps/web/.env.local`. Never add an
importer token. Only the `development` dataset is accepted.

The rules setting takes comma-separated Sanity Competition document IDs whose
national men's rules you have verified. Omit it for unverified competitions;
fixtures and players still display, but their table awaits rule confirmation.

In Studio, enable **Aalborg team** on the relevant Teams. Player cards need
confirmed Player references in completed-match participants/events; they are
not an independent squad roster. Reuse existing imported records to preview.

## Use fictional data without Sanity

```sh
AFK_CONTENT_PROJECT_ID='' AFK_CONTENT_DATASET='' \
  AFK_CONTENT_SNAPSHOT="$PWD/apps/web/fixtures/editorial.json" \
  AFK_SPORTS_PROJECT_ID='' AFK_SPORTS_DATASET='' \
  AFK_SPORTS_SNAPSHOT="$PWD/apps/web/fixtures/public-sports.json" \
  AFK_SPORTS_NATIONAL_MEN_COMPETITIONS=example-cup pnpm dev
```

The blank project/dataset values override any local Sanity configuration.
The page labels this fixture as an example. To see the empty state, also set
`AFK_SPORTS_SNAPSHOT=''` and `AFK_SPORTS_NATIONAL_MEN_COMPETITIONS=''`.

## Build and serve locally

Use the same settings with `pnpm build` instead of `pnpm dev`, then serve the export:

```sh
python3 -m http.server 4173 --directory apps/web/out
```

Open http://localhost:4173/kampe/ (also `/stilling/` and `/spillere/`).
Static output needs rebuilding after imports or Studio edits. There is no runtime
refresh; `pnpm start` does not serve this static export.

If Turbopack's CSS worker cannot bind a local port in a restricted environment,
use `pnpm --filter @afk/web exec next build --webpack` with the same data settings.

## What to check

- Fixtures/results agree with Studio; known 0–0 differs from a missing score.
- Player counts are confirmed minimums; unresolved names do not become profiles.
- Standings are labelled provisional; shared ranks and points adjustments are visible.
- Mobile layouts, keyboard navigation and empty states work.
- A configured data-read failure is visible rather than displayed as an empty league.

## Browser checks

Install Chromium once with `pnpm exec playwright install chromium`.
Build the fictional-data export, overriding any local Sanity configuration:

```sh
AFK_CONTENT_PROJECT_ID='' AFK_CONTENT_DATASET='' \
  AFK_CONTENT_SNAPSHOT="$PWD/apps/web/fixtures/editorial.json" \
  AFK_SPORTS_PROJECT_ID='' AFK_SPORTS_DATASET='' \
  AFK_SPORTS_SNAPSHOT="$PWD/apps/web/fixtures/public-sports.json" \
  AFK_SPORTS_NATIONAL_MEN_COMPETITIONS=example-cup pnpm build
pnpm test:e2e
```

The tests start and stop a local static server on port 4173, which must be free.
They cover page loading, shared layout, active navigation, mobile disclosure,
keyboard access, news index/article navigation, contact links and horizontal
overflow at desktop/mobile viewport sizes.
Use the webpack build alternative above if needed. These checks use fictional
content and do not access Sanity; they are not a full accessibility audit.
