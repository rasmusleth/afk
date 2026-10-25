# Public sports views

Task 7 adds Danish pages at `/kampe/`, `/stilling/`, and `/spillere/`. The root
also shows the match view. Each page groups records by Competition and its
referenced Season, newest Season first. Aalborg fixtures and players use the
Team's explicit **Aalborg team** flag, never its name. The table includes the
whole competition, including opponents. Player cards include the existing
plain-text profile and confirmed statistics per competition; players appear
once linked to recorded participation/events in completed matches. There is
no independent roster or guessed player identity.

The web app uses `@afk/sports` for all player and table calculations. Official
scores are independent of goal-event coverage. A verified 0–0 is displayed;
missing scores, imprecise dates, unknown substitutes and unverified results
remain visibly distinct. Player numbers are labelled confirmed minimum counts,
including confirmed zero counts, rather than exhaustive totals. Unresolved
source names are not displayed as public profiles. Missing profiles/sections
and unresolved participant identities are counted separately.

The table is always labelled provisional, with the number of included results.
Shared rankings and unresolved derivation issues remain visible. Point rulings
show their signed adjustment, reason and HTTP(S) source when supplied. There is
no claim of official DBU verification and no inference of zero no-shows.

## Offline preview (no Sanity or credentials)

From the repository root, with Node 24 and the pinned pnpm installed:

```sh
pnpm install
AFK_SPORTS_SNAPSHOT="$PWD/apps/web/fixtures/public-sports.json" \
  AFK_SPORTS_NATIONAL_MEN_COMPETITIONS=example-cup pnpm dev
```

Open the three routes on the local URL printed by Next. The fixture is explicitly
fictional and the page labels it as an example. Check the confirmed 0–0, 2–1
with incomplete goal events, the completed match without a score, upcoming
fixture with date but no time, unverified scored fixture with unknown date,
point deduction and two player profiles (one unresolved substitute). Imported
unresolved names must not appear as profiles.

For the empty state, omit all `AFK_SPORTS_*` variables and run `pnpm dev`.
Configured read errors fail visibly rather than becoming an empty league.

## Development Sanity preview (manual read only)

No connected dataset was accessed during implementation. Reuse the development
records from the successful [batch import](./dbu-batch-sync.md). Do not rerun an
import merely to view these pages.

1. In Studio, confirm the intended Team records have **Aalborg team** enabled
   and that Competitions reference the correct Season. Resolve Player references
   through the existing review workflow if you want attributed player cards.
   No schema migration or totals entry is needed.
2. Confirm whether the **development** dataset already permits unauthenticated
   reads. This reader intentionally has no credential support. If it is private,
   do not change visibility or provide an importer token to the website. A
   separately approved server-side read/export setup is still needed; meanwhile
   use the offline preview. No production target is accepted.
3. From the repository root, substitute the public project ID and the published
   Competition document IDs whose national men's futsal rules you have verified:

   ```sh
   AFK_SPORTS_PROJECT_ID=YOUR_PROJECT_ID \
     AFK_SPORTS_DATASET=development \
     AFK_SPORTS_NATIONAL_MEN_COMPETITIONS=dbu-competition-508399 pnpm dev
   ```

   Use comma-separated IDs for multiple verified competitions. These values are
   configuration identifiers, not credentials. Do not use `NEXT_PUBLIC_*` or
   add a token. Omit the rules variable for other/unverified competitions: their
   fixtures and players still render, while their table awaits rule confirmation.
4. Compare the displayed results and player counts against Studio and the
   existing read-only statistics report. Check opponent results and point
   adjustments as well as Aalborg details. Equal-point teams may share a rank
   because no-show facts remain unknown. The view never silently adopts DBU's
   official placement. Test narrow/mobile layouts and keyboard navigation too.

Reads happen in Server Components, with published perspective and explicit
projections excluding technical import metadata. Source names are read only to
validate unresolved match facts; they are not rendered. Requests have a 20-second
timeout and responses over 8 MB fail. No browser Sanity requests, CORS setup,
API routes, server actions, synchronization, writes or persistent server are
required. With no configuration, builds make no Sanity requests.

## Static build and local serving

`next.config.ts` enables `output: 'export'` and trailing slashes. Cache Components
and partial prefetching were removed because this Next version rejects PPR in
export mode. All four public routes produce static HTML. Network reads use
Next's default uncached build-time fetch to avoid reusing a previous build's data cache;
there is no runtime refresh or ISR. Rebuild after content changes.

Use the same environment variables for `pnpm build` as for development. The
result is `apps/web/out`, which can be served directly on a static host. For a
fully offline production-build preview:

```sh
AFK_SPORTS_SNAPSHOT="$PWD/apps/web/fixtures/public-sports.json" \
  AFK_SPORTS_NATIONAL_MEN_COMPETITIONS=example-cup pnpm build
python3 -m http.server 4173 --directory apps/web/out
```

Open `/kampe/`, `/stilling/`, and `/spillere/` at `http://localhost:4173`.
`next start` is not used with static export. No deployment is part of this task.

In the agent's restricted environment Turbopack's CSS worker cannot bind its
local port (including on retry). The equivalent production/export validation
uses `pnpm --filter @afk/web exec next build --webpack`, with the same environment
variables; no repository build safeguards are disabled. Both the unconfigured
build and the fictional-data build should be verified. Run `pnpm test`,
`pnpm typecheck`, and `pnpm lint` for the complete workspace checks.
