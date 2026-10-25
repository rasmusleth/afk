# Manual development match-detail import

Run the schedule importer first. This command adds participants and supported
match events to an existing Match. Start with an Aalborg match, for example
602659 in pool 508399. It does not create Players from names or calculate independent totals.
The [editor review workflow](sports-editor-review.md) handles uncertainty and corrections.

## Offline trial

From the repository root, with Node 24 and dependencies installed:

```sh
pnpm sync:details --match 602659 --pool 508399 \
  --html packages/dbu/fixtures/match-602659.html \
  --existing packages/importer/fixtures/detail-development.json
```

Both files are inputs. The JSON snapshot is a small fictional development
state built from the saved public schedule, not an export of a real dataset.
The command prints one proposed Match patch and review reasons. To save that
report, append `> /tmp/afk-detail-plan.json`. The report is not a dataset snapshot;
it cannot be supplied to `--existing`. No files, credentials or services change.

## Connected preview and apply

Use the same development project/token you verified for schedule imports.
Your existing Season, Competition, Teams and Match remain in Sanity; do not
recreate them. This command resolves their verified external identities.

```sh
pnpm sync:details --match 602659 --pool 508399 \
  --project YOUR_PROJECT_ID --dataset development \
  --html packages/dbu/fixtures/match-602659.html
```

1. Replace the project ID. Check Studio targets that same development project.
2. Paste the token into the hidden terminal prompt and press Enter. No visible
   characters is expected. Never put the token in a command, file or chat.
3. Inspect the plan: one existing Match, teams matching the fixture, supported
   events, participants and review reasons. Unresolved names and unknown assists
   or substitute appearances are expected review items, not failed validation.
4. Run the same command with `--apply` when ready to write. Inspect the freshly
   computed plan, then type `apply YOUR_PROJECT_ID/development` to confirm.
5. Open that Match's Lineup and Events tabs in Studio. Check names, shirt
   numbers, scorer/card facts and minutes against the source. Starter appearances
   are played only with completed-match evidence; substitutes remain unknown
   unless a confirmed Player reference establishes event involvement.
6. Repeat a preview: existing embedded keys stay stable and facts do not duplicate.
   A later run refreshes sync/last-seen timestamps, so a metadata patch is normal.

Omit `--html` to fetch the current public match page instead. `--match` and
`--pool` must agree with the actual source identity. This command imports one match at a time. For a complete competition refresh,
use [the batch workflow](./dbu-batch-sync.md), which checks all reported results
and imports Aalborg match details by default. Neither command is scheduled.
Fixture HTML is a historical snapshot.
No timezone flag is needed because this command leaves kickoff to schedule sync.

The credential handling, development-only target, bounded public fetching,
atomic revision guard and no-retry behavior are shared with
[the schedule workflow](dbu-schedule-sync.md). Standard Editor tokens are still
project-wide; the dataset guard is not an authorization boundary. No real token,
authenticated detail read or detail write was used during implementation.
A manual development trial after review remains necessary.

## Reconciliation rules and limits

- Each imported item gets a random internal Sanity `_key` once. It is not a DBU
  player/event ID. Names alone never resolve a Player document.
- Hidden `detailSignature` fingerprints match source observations, independent
  of subsequent local corrections. Participant anchors use team and source name;
  event anchors use the supported event facts, including minute and goal method.
  Source order is excluded. An exact source observation reuses the existing key.
- Identical repeated events retain distinct keys by occurrence only when their
  count stays unchanged. They remain flagged because individual identity cannot
  be established. Count changes retain existing items without guessed additions.
- Changed or disappearing observations retain existing facts and enrichment.
  If any old imported observation is unmatched, unmatched new observations in
  that array are withheld for review. This deliberately favors preservation;
  a changed minute/scorer can therefore need manual resolution. Missing source
  sections never clear arrays. Legacy imported items without signatures are
  retained conservatively, not silently adopted.
- Manual events/participants survive. Matching manual observations are flagged
  instead of duplicated. Last accepted array keys detect local removals and
  protect the array with an override, preventing automatic recreation. Clearing
  that override after a sync permits a later import to supply it again.
- Embedded `detailBaseline` fingerprints detect field edits and deliberate
  unsets. Explicit/nested overrides protect corrections. Player links and manual
  assists are preserved. Missing source values do not erase known values.
  Detail and schedule baselines/timestamps remain separate; their shared status
  fingerprints are coordinated to avoid treating an importer update as a manual edit; both use the existing
  internal `scheduleFieldBaseline` object shape for field fingerprints.
- Supported goals, yellow cards and red cards are imported. Verified penalty
  goals carry `method: penalty`; other goals are `unspecified`, not proven
  non-penalties. Own goals, combined yellow/red cards and missed penalties lack
  a verified canonical mapping and remain review items without guessed credit.
- Source diagnostics, identity uncertainty, unknown appearances/assists, and
  incomplete goal coverage produce review metadata and CLI review items.
  Review reasons persist until manually resolved; they are not automatically
  cleared. The normal editor forms still hide technical metadata; editor-facing review and correction controls are documented separately.
- Explicit detail completion status can update an unprotected Match; a numeric
  score does not prove completion. Schedule facts such as score, venue and
  kickoff stay owned by schedule sync. A differing detail score is flagged.

Tests cover saved completed, own-goal and penalty fixtures, repeat/reordered and
identical observations, manual enrichments, source corrections/disappearances,
missing sections, array removals, confirmed appearance evidence, invalid identity
or metadata, immutable planning, offline CLI behavior and guarded persistence.
Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm studio:schema`, and
`pnpm studio:build` with the documented Studio configuration.
