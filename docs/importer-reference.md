# Importer reference

For everyday use, start with [DBU → Sanity](sports-data.md).
These are optional commands and offline examples. Run from the repository root.
Connected imports share the hidden token prompt, preview default and
`--apply` confirmation described in that guide.

## Schedule only

Creates missing Competition, Team and Match records and refreshes schedule
facts. Does not import participants/events. A score in the schedule does not
establish completion; use the competition batch for verified standings results.

```sh
pnpm sync:schedule --pool 508399 --season YOUR_SEASON_ID \
  --time-zone Europe/Copenhagen \
  --project YOUR_PROJECT_ID --dataset development
```

## One match's details

The Match and its teams must already exist from a schedule or batch import.
Imports participants and supported events, and can establish completion.
It flags score differences but leaves score and kickoff to schedule/batch sync.

```sh
pnpm sync:details --match 602659 --pool 508399 \
  --project YOUR_PROJECT_ID --dataset development
```

Both commands above preview only. Append `--apply` to write after checking the
fresh plan and typing the target confirmation.

## Competition batch options

| Option | Effect |
| --- | --- |
| `--details club` | Default: full details for selected Aalborg matches, results only for opponents |
| `--club-team-entry 404636` | Select the club entry for this run instead of relying on Studio's flag |
| `--details none` | Verify results without importing any player details |
| `--details all` | Import full details for every selected verified match; creates more identity review work |

Use `--club-team-entry` only with club details. Upcoming fixtures are refreshed
from the schedule; their individual pages are not fetched without result evidence.

## Save clean JSON output

Invoke the underlying CLI directly to avoid package-manager output in the file.
Keep the terminal interactive for the hidden token prompt:

```sh
node packages/importer/batch-cli.ts --pool 508399 --season YOUR_SEASON_ID \
  --time-zone Europe/Copenhagen --project YOUR_PROJECT_ID \
  --dataset development --club-team-entry 404636 > /tmp/afk-import-preview.json
```

This is a report, not an apply file or an input for `--existing`.
The other entry points are `cli.ts`, `detail-cli.ts` and `report-cli.ts` in
`packages/importer/`.

## Try without Sanity or credentials

These use historical saved HTML and fictional local records. They make no
network requests or writes. Do not use the historical subset for a real refresh.

Competition batch (two matches, details for Aalborg match 602659):

```sh
pnpm sync:competition --pool 508399 --season season-example \
  --time-zone Europe/Copenhagen \
  --html packages/importer/fixtures/batch-schedule-508399.html \
  --match-html-dir packages/dbu/fixtures \
  --existing packages/importer/fixtures/empty-development.json \
  --club-team-entry 404636
```

Schedule (one competition, ten teams and 90 matches):

```sh
pnpm sync:schedule --pool 508399 --season season-example \
  --time-zone Europe/Copenhagen \
  --html packages/dbu/fixtures/competition-508399.html \
  --existing packages/importer/fixtures/empty-development.json
```

Single match:

```sh
pnpm sync:details --match 602659 --pool 508399 \
  --html packages/dbu/fixtures/match-602659.html \
  --existing packages/importer/fixtures/detail-development.json
```

`--existing` takes a document-array snapshot and cannot be combined with a
Sanity target or `--apply`. Relative paths start at the directory where you
invoked the command. `--html` replaces a live page with a saved file; offline
batches also require every selected `match-NUMBER.html` in `--match-html-dir`.

## Preservation and limits

DBU's recorded assists are imported as credited source names. Confirm the Player
links in Studio to attribute statistics. Rerun a normal match-detail or competition
sync to correct old combined scorer/assister names; no deletion/reimport is needed.
Only uniquely matched stored source signatures upgrade automatically.

- Missing source data does not delete records or erase manual enrichment.
  Ambiguous changed/disappearing events are retained and flagged; new unmatched
  events may be withheld for review. Reimports preserve existing item keys.
- Similar names never merge Players. Goals (including verified penalties),
  yellow and red cards are supported. Own goals, combined yellow/red cards
  and missed penalties have no verified canonical mapping.
- Importers respect manual corrections and reject concurrent edits. There are
  no automatic write retries or partial batch commits.
- A batch checks at most 100 match pages. Transactions are limited to 500
  mutations and 4 MB; snapshots to 10,000 records. Exceeding a bound stops the run.
- Invalid records, identity collisions, conflicting drafts/releases or blocking
  source diagnostics require investigation before importing.

Domain and reconciliation decisions live in [architecture.md](architecture.md).
Markup evidence lives in [DBU source notes](dbu-source-notes.md),
[schedule research](dbu-schedule-sync-research.md) and
[standings research](dbu-standings-research.md).
