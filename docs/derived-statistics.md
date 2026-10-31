# Statistics and standings

Statistics are calculated from saved matches; no totals are written back to
Players or Teams. Use [DBU → Sanity](sports-data.md) to import or refresh data first.

## Run a report

Copy the Competition document `_id` from Studio, then run from the repository root:

```sh
pnpm stats:report --competition YOUR_COMPETITION_ID \
  --rules national-futsal-men \
  --project YOUR_PROJECT_ID --dataset development --compare-dbu
```

Enter the token at the hidden prompt. A Viewer token is sufficient. This command
never writes. Omit `--compare-dbu` to calculate from Sanity without fetching DBU.
The rules are verified for pool 508399's researched regulations; verify them
before using the option for another competition or historical season.

To save clean JSON, use `node packages/importer/report-cli.ts` with the same
options and append `> /tmp/afk-statistics-report.json`.
Inspect `standings`, `competitionPlayers`, `season.playerStatistics` and `comparison`.

## Read the results

- `known*` counts are confirmed facts, not guaranteed complete season totals.
  Only completed matches contribute. Player attribution needs confirmed references.
- `unknownAppearances` counts linked substitutes whose participation is unresolved.
  Coverage separately identifies missing sections and unresolved source names.
- Standings need completed matches with official scores for **every team**.
  Missing goal events do not invalidate an official score. Use the competition
  batch to verify opponent results as well as Aalborg results.
- Competition points adjustments apply only to that competition. Record a
  verified ruling with its reason; never invent one to match DBU's table.
- Equal-point teams can share ranks because no-show counts or tie-break details
  are unknown. Comparisons flag differences; they never copy DBU totals into Sanity.
  `comparison.matches` stays false while derivation issues remain.

For verified ranking inputs, `--no-shows FILE` accepts a JSON map of internal
Team IDs to counts. Use `--assume-no-shows-zero` only if zero has been established
for every team. Full rules and evidence: [standings research](dbu-standings-research.md).

## Offline example

```sh
pnpm stats:report --competition dbu-competition-508399 \
  --rules national-futsal-men \
  --existing packages/importer/fixtures/detail-development.json \
  --standing-html packages/dbu/fixtures/standing-508399.html
```

This small fictional snapshot has two teams and no verified completed results;
expect incomplete coverage and differences from the saved official table.
It makes no network requests or writes. `--standing-html FILE` can also replace
live comparison in a connected report; do not combine it with `--compare-dbu`.
