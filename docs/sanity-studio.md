# Sports Studio

The Studio is a standalone static application in `apps/studio`, beside the
public Next.js site in `apps/web`. Each app owns its dependencies, configuration,
and local environment files. The root is a pnpm workspace with shared tooling.
Run commands from the repository root using pnpm and Node 22.12+ (Node 24 is
recommended and used for validation). Sanity and styled-components provide
the Studio; the TypeScript version satisfies Sanity's workflow peer dependency.
No importer, API credentials, deployment, or production connection is included.

## Local setup still needed

1. Choose or create a Sanity project and a **development dataset**. No project
   or dataset has been provisioned by this PR.
2. Copy `apps/studio/.env.example` to `apps/studio/.env.local` and supply
   `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`. These are public configuration values, not
   credentials. All `SANITY_STUDIO_*` variables can enter the browser bundle;
   never use that prefix for secrets.
3. Run `pnpm studio` and open http://localhost:3333. Sign in using Sanity's
   normal Studio login with access to the chosen development dataset.
4. If required by the project, an administrator must allow the local Studio
   origin in Sanity. This PR does not change project access or CORS settings.

Decide the Studio hosting location before deployment. `pnpm studio:build`
produces `apps/studio/dist/`, which can be hosted separately from the public
site. No hosting configuration or deployment is included. A separate importer credential
and dataset permissions are future setup, not a reason to put a token in Studio.

For offline verification, the following deliberately fake project configuration
allows schema extraction and bundling without accessing a real dataset:

```sh
SANITY_STUDIO_PROJECT_ID=localtest SANITY_STUDIO_DATASET=development pnpm studio:schema
SANITY_STUDIO_PROJECT_ID=localtest SANITY_STUDIO_DATASET=development pnpm studio:build
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Schema extraction writes `apps/studio/.sanity/schema.json`; Studio output is
ignored by Git and ESLint. Bundling with placeholders does not verify login, permissions, or
live editing against Content Lake. Verify those with the development dataset
before giving editors access. Configuration fails clearly if either variable
is missing, rather than silently targeting an unintended dataset.

## Using the Sanity setup command

This repository already contains the Studio and its schemas. To select or create
an account project and development dataset through Sanity's interactive setup,
run this from the repository root:

```sh
pnpm create sanity@latest --bare --dataset development
```

Choose the intended project/account in the prompts. `--bare` skips Studio
scaffolding and prints the selected project ID and dataset name. Put those
public values into `apps/studio/.env.local`, then run `pnpm studio`. This uses
the existing sports schemas instead of generating a clean template over them.
See [Sanity's init reference](https://www.sanity.io/docs/cli-reference/init).
The command provisions/selects cloud resources, so it is a manual setup step;
it is not needed for offline checks and has not been run by this PR.

For example, the local file should contain your public identifiers:

```dotenv
SANITY_STUDIO_PROJECT_ID=your_project_id
SANITY_STUDIO_DATASET=development
```

If you previously configured Sanity in a root `.env.local`, transfer only these
Studio settings to `apps/studio/.env.local`; root environment files are no longer
loaded by either app. Next.js settings belong in `apps/web/.env.local`.
To run Studio commands directly, use `cd apps/studio` followed by `pnpm dev`,
`pnpm build`, or `pnpm schema`. The root shortcuts do this through pnpm filters.

## Editing and data contracts

All five sports document types use `liveEdit: true`: edits are continuously
saved to published documents, including incomplete records. There is no
publish approval step. Validation provides editor feedback, but **does not
block invalid live edits or govern API writes**. Future public readers must
remain tolerant of incomplete records, and the importer must call the pure
checks in `packages/sports/validation.ts` before writing. References are strong.
Match season is obtained through Competition, not stored twice.

Matches keep official scores independent of goal coverage. A score is either
absent or a complete pair of non-negative integers. Missing events never invent
player goals. Participants and typed goal/yellow-card/red-card objects live
in arrays, each with a persistent Sanity `_key`. New manual items receive a
manual origin; future imports must explicitly set imported origin and retain
keys on reconciliation. Repeated otherwise identical events are valid facts.
Penalty variants await inspected DBU fixtures.

Player references assert confirmed identity; unresolved participants, scorers,
and assisters retain source names instead. Shirt numbers belong to match
participants. Assist state explicitly distinguishes unknown, none, and credited
(the latter needs a player or a source name). An appearance can be unknown,
played, or did not play. `appearanceFromEvidence` recognizes completed-match
starters and player-linked event involvement, including credited assists. It
does not infer identity from equal source names. No editable statistics totals
are stored on Player or Team.

Kickoff precision is unknown, date only, or exact time. Populate only the
corresponding date or timestamp; clear the previous value when changing
precision. This avoids inventing a midnight kickoff. Similarly, clear an
assister before switching the assist state away from credited. Signed points
adjustments belong to the affected Competition and can repeat a team. Their
reason is required; source citation and originating Season are optional.

## Import and override metadata

`external` stores `{source, id, scope?, sourceUrl?}` separately from Sanity IDs.
For DBU, Match `id` will be the match number, Competition `id` the pool ID,
and Team `id` the team-entry ID **with pool ID as `scope`**. Player identities
must only be supplied when verified; names alone are not identifiers. These
are storage contracts, not implemented DBU mappings.

`import` stores origin, first-import/last-seen/schedule/detail timestamps,
review markers, and `overrides`. Override entries are paths relative to the
containing document or embedded object, for example `venue` on Match or
`player` and `assist` on a goal. An override protects an explicitly corrected
field; missing imported data must also preserve manual enrichment even without
an override. Clearing a path permits the next successful sync to provide it;
it does not immediately restore an old imported value.

Technical metadata is hidden and read-only in normal forms. This is editor UX,
not access control. **Automatic override recording, override-clearing controls,
and a review queue are Task 5 of the work plan.** Until those exist, do not run
synchronization against manually edited imported records. The initial Studio
is suitable for manually entered sports records; it does not yet guarantee
protection of manual changes during a future sync. No fetching, synchronization,
reconciliation, or destructive import behavior is implemented here.
