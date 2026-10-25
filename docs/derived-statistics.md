# Derived player statistics and standings

Task 6 adds pure read models and a read-only development report. Nothing is
stored back on Player, Team, Season or Competition. Match facts remain canonical;
points rulings remain explicit Competition adjustments. Public pages are Task 7.

## Try your development data

1. In Studio, open the Competition and copy its document `_id` from the inspector.
   Use the ID, not its name. For an importer-created pool 508399 this is normally
   `dbu-competition-508399`; existing arbitrary internal IDs are also supported.
2. Run this from the repository root, replacing the two identifiers:

   ```sh
   pnpm stats:report --competition YOUR_COMPETITION_ID \
     --rules national-futsal-men \
     --project YOUR_PROJECT_ID --dataset development \
     --compare-dbu > /tmp/afk-statistics-report.json
   ```

3. Paste your development token into the hidden terminal prompt and press Enter.
   You can reuse your development importer token. This command only reads, so a
   dedicated Viewer token is also sufficient; do not put a token in a command,
   environment file or chat. Standard token permissions remain project-wide;
   the development dataset restriction is an application guard. See
   [Sanity's token roles](https://www.sanity.io/docs/content-lake/roles-concepts).
4. Open `/tmp/afk-statistics-report.json` in your editor. The pnpm `$ …` log lines
   can remain in the terminal while JSON is redirected to the file. This file is
   an inspection report, not an updated dataset snapshot or importer input.
5. Inspect `standings`, `competitionPlayers`, `season.playerStatistics`, and
   `comparison`. Missing facts and differences are expected where data is
   incomplete. The command has no `--apply` option or confirmation to write.

`--rules national-futsal-men` is an explicit rule choice, verified for pool
508399's current linked regulations. Do not apply it to another competition or
historical season without checking its applicable rules. Omit `--compare-dbu`
for local derivation without retrieving DBU. Use `--standing-html FILE` instead
to compare a reviewed saved table; its capture time may differ from your data.

No new setup, totals migration or reimport is required merely to produce a
report. A real authenticated report has not been run during implementation;
the development read and actual token permissions still need this manual trial.

## Reading the results honestly

### Player facts and Season scope

Player rows contain `knownAppearances`, `unknownAppearances`, `knownGoals`,
`knownAssists`, `knownYellowCards`, and `knownRedCards`. Only completed matches
contribute. A confirmed Player reference is required for attribution; equal
source names never merge people or create Player rows. Missing profiles do not
invalidate a confirmed reference; a name is included only when its Player
record is available in the snapshot.

A completed-match starter provides appearance evidence. A substitute listing
alone is unknown. A confirmed scorer, card recipient or credited assister has
appearance evidence even when participation data is missing. Each player is
counted once per match; distinct keyed goal/card facts still count separately.
Penalty goals count once as goals. Unsupported own-goal/combined-card variants
never become guessed player facts.

`unknownAppearances` counts listed, confirmed Players whose participation
remains unresolved. It does not estimate appearances for unidentified names or
players absent from a missing lineup. Team/match `coverage` separately reports
unresolved participants, scorers, assisters and card recipients, unknown assists,
missing sections and differences between official goals and recorded events.
An array being recorded does not prove complete event coverage, particularly
for cards. A known count of zero means zero confirmed facts in the selected
records; it is not proof of an exhaustive zero total.

Use Sports review to confirm identities, assists and substitute appearances
before expecting attributed statistics. Manual and imported facts are treated
alike. No independent counters are edited. Season aggregation follows the
Competition's Season reference across its competitions and scoped team entries,
not kickoff dates or name matching.

### Standings and incomplete result coverage

Rows show played/won/drawn/lost, goals for/against/difference, away goals,
earned points, signed adjustments, adjusted points and derived rank. Only
explicitly completed matches with complete, non-negative official scores count.
Missing or incomplete events never change a known official score. Duplicate or
invalid match identities/items and invalid adjustments are reported, not used
to inflate totals. Unsafe integer totals stop the calculation visibly.

**Your current table may be partial even after importing all played Aalborg
matches.** The schedule importer preserves scores whose completion status is
unknown. Those results remain excluded with `unverified-result` issues until
completion is established. To reproduce the full league table you need verified
results for opponent-versus-opponent matches too; player lineups/events are not
needed for standings. Use [the competition batch importer](./dbu-batch-sync.md) to verify those
results without importing all opponent player details. The single-match importer
and manual Studio corrections remain available. Do not mark a match completed
just because it has a number or a past date. No automatic status inference is used.

Each adjustment is applied only to its containing Competition, even when its
`originatingSeason` is earlier. Multiple rulings for the same team accumulate;
negative points are valid. The report retains adjustment reasons/sources for
later presentation. Never invent a reason or a ruling to make a comparison pass.

### Ranking and official comparison

The national men's propositions establish 3/1/0 scoring, followed on equal
points by fewer no-shows, overall goal difference, goals scored, away goals,
wins, and then head-to-head points/difference/goals/away goals. The remaining
ultimate tie requires an external sporting decision, not an alphabetical rule.
See [verified sources and limits](dbu-standings-research.md).

No-show counts are not in our match model or the inspected official table.
Without explicit counts, tied points retain shared ranks and an
`unknown-no-shows` issue. If you have verified counts, supply a JSON map from
internal Team IDs to non-negative integers with `--no-shows FILE`. Alternatively,
`--assume-no-shows-zero` asserts that you have established zero for every entry;
never use it merely to silence a warning. These inputs are report parameters,
not stored editable totals. Two-team head-to-head is supported. Multi-team ties
that require an unverified subgroup interpretation remain shared and flagged.
Within shared ranks, internal IDs stabilize display order without deciding rank.
All derived ranks remain subject to result-coverage and adjustment issues.

Comparison resolves the official table's scoped external Team identities to
existing internal IDs. It checks placement (where resolved), matches played,
wins/draws/losses, goals and adjusted points. Missing/duplicate identities,
unknown values and ranking uncertainty prevent a clean match. A difference
reports the team, field and values; it never copies official totals or silently
updates matches/adjustments. `comparison.matches` is false while derivation
issues remain, even when compared numeric fields happen to agree.

The saved official fixture shows Hjørring with four wins but −6 points. That
implies an adjustment relative to 3/1/0 earned points, but the page does not
establish its reason. Investigate a reliable ruling before recording any
Competition adjustment. Snapshots captured at different times can also differ
because new matches were played or corrected.

## Offline example

```sh
pnpm stats:report --competition dbu-competition-508399 \
  --rules national-futsal-men \
  --existing packages/importer/fixtures/detail-development.json \
  --standing-html packages/dbu/fixtures/standing-508399.html \
  > /tmp/afk-statistics-example.json
```

This deliberately small fictional snapshot contains the Season, Competition,
two Teams and one fixture before detail import. Expect two derived rows, no
verified completed results or attributed Players, and official comparison
warnings for the other eight teams. This demonstrates unknown coverage, not
real zero sporting totals. Both input files remain unchanged; no token or
network is used. Automated integration tests also exercise the full saved
schedule and completed match details with explicit synthetic Player references.

## Interfaces and checks

- `@afk/sports/statistics`: `derivePlayerStatistics(matches, {teamId?})`.
- `@afk/sports/derivation`: record types and `selectSeasonMatches`.
- `@afk/sports/standings`: `deriveStandings(competition, entries, matches,
  {rules, noShows?})`, `nationalFutsalMen`, and `compareStandings`.
- `@afk/dbu/standings`: separate HTML parsing and normalization. Honor diagnostics
  before comparing. Parser tests use the inspected table fixture and mutations.
- `packages/importer/report.ts`: source identity resolution and report assembly,
  separate from credential prompting, public fetching and CLI output.

The pure functions require no React, Sanity runtime or network. API readers
must retain `known*` labels and uncertainty instead of presenting those values
as complete totals. The report reuses the bounded development snapshot reader,
now including Player names; drafts/releases are excluded from derivation. The
existing snapshot/HTML limits still fail rather than silently truncating data.

Run `pnpm test`, `pnpm typecheck`, and `pnpm lint`. Fixture-based tests cover
partial events/lineups, unresolved identities and substitutes, assists/cards,
penalty goals, Season membership, duplicate records, score finality, points
adjustments, verified ranking tiers, unresolved ties, official-table parsing,
read-only CLI output and scope-safe identity comparison.
