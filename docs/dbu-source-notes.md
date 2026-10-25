# DBU source observations

Inspected public DBU HTML on 22 October 2026. These are observations of the
linked pages, not a published DBU API contract. Saved fixtures are the parser
test contract; unrecognized source markup must produce errors or diagnostics rather than
silently remove or reinterpret data.

## Schedule and match details

The [full pool schedule](https://dbu.dk/resultater/pulje/508399/kampprogramFuld)
contains desktop and mobile representations inside each match row. Parse each
row once. Rows carry an `onclick` calling `MatchProgramMatchClick` with the
match URL, including upcoming matches without a visible match-detail anchor.
Team anchors use `/resultater/hold/<entry>_<pool>`; venue anchors use
`/resultater/stadium/<id>`. Played rows expose separate `home-score` and
`away-score` elements. The row for 602678 displays `UDS` with both `title` and
`data-tippy-content` equal to `Kamp udsat`; retain its listed date/time alongside
the postponed status. Blank result cells on future fixtures are not zeroes.

[Match 602659](https://dbu.dk/resultater/kamp/602659_508399/kampinfo) identifies
the match number explicitly and links pool 508399. Its image metadata also
names `matchid=602659` and `poolid=508399`, confirming the two URL components
for this page. The page displays `Færdigspillet` and an official 4–3 score.
This sample verifies completed and postponed status observations; it does not
establish DBU's complete status vocabulary or exceptional result rules.

[Upcoming match 602675](https://dbu.dk/resultater/kamp/602675_508399/kampinfo)
has empty score cells, no lineup section and no explicit status label.
[Postponed match 602678](https://dbu.dk/resultater/kamp/602678_508399/kampinfo)
labels `Status` as `Kamp udsat` in its match-info section. Its listed kickoff
remains present. Blank status is normalized to unknown, including numeric
schedule results whose finality has not been explicitly established; a score
alone does not prove a completed match.

The same page's `.sr--match--team-card_home` and `_away` sections contain a
first player table, a separate `Reserver` table, and staff information. Player
names are spans/plain text and shirt numbers are separate cells. No player
profile links or reliable player IDs were found in these lineups or timeline
rows, including [match 602665](https://dbu.dk/resultater/kamp/602665_508399/kampinfo).
Do not infer an appearance from a substitute listing, derive an assist from
missing text, or resolve a Player identity from a name alone.

## Observed timeline markup

Timeline rows use `.sr--match--live-score--event`; the `--minute` element
contains values such as `&#x27;34`, and the `--home` / `--away` descendant
identifies the displayed side. The `--player` element holds a source name.
Neutral rows have `--neutral` and text such as `Kamp start`,
`2. halvleg start`, and `Kamp slut`. No stable event identifier was observed.
The images below have no descriptive `alt` text in the inspected rows, so
image basenames are the observed event discriminator.

| Image basename under `/Content/Gfx/SR/livescorev2/` | Evidence |
| --- | --- |
| `icon_sr_goal.svg` | Ordinary goal rows in [602659](https://dbu.dk/resultater/kamp/602659_508399/kampinfo). |
| `icon_sr_yellow.svg` | Yellow-card rows in [602659](https://dbu.dk/resultater/kamp/602659_508399/kampinfo). |
| `icon_sr_red.svg` | Away row, minute 36, Maicon Tauan Dias Alves in [602658](https://dbu.dk/resultater/kamp/602658_508399/kampinfo). |
| `icon_sr_penaltyGoal.svg` | Home row, minute 22, Sebastian Østergård Kargo Larsen in [671446](https://dbu.dk/resultater/kamp/671446_476135/kampinfo). This establishes an explicit penalty-goal variant. |
| `icon_sr_goalOwn.svg` | Three distinct rows in [602662](https://dbu.dk/resultater/kamp/602662_508399/kampinfo), including home rows at minutes 38 and 33. Preserve as a separate unsupported variant until own-goal semantics are modeled; do not credit an ordinary scorer goal. |
| `icon_sr_yellowred.svg` | Away row, minute 26, Daniel Kwanin Ohemeng in [662399](https://dbu.dk/resultater/kamp/662399_476135/kampinfo). Preserve as a separate unsupported variant until card-counting semantics are agreed; do not silently treat it as an ordinary yellow or direct red. |

The observed penalty-goal icon does not distinguish a six-metre penalty from
other futsal penalty variants. No missed-penalty event was located among the
14 completed matches linked from pool 508399 and 89 successfully retrieved
matches from [pool 476135](https://www.dbu.dk/resultater/pulje/476135/kampprogramFuld)
(one of its 90 linked pages failed retrieval). Absence in this sample is not
evidence that DBU never reports misses. Do not guess a missed-penalty image
name or map unknown icons to goals; retain the source icon/name/minute/side
and report an unsupported-event diagnostic.

## Identity limits and remaining questions

The schedules for [508399](https://dbu.dk/resultater/pulje/508399/kampprogramFuld)
and [476135](https://www.dbu.dk/resultater/pulje/476135/kampprogramFuld) both
link Aalborg using entry 404636, with their respective pool suffixes. This is
evidence of reuse across these pools, not a guarantee of identity stability
across all seasons or competition entries. Preserve the full source scope.
Match URLs and explicit match numbers support traceability, but these pages
alone do not prove lifetime global uniqueness of every DBU match number.

Still unverified: reliable public player IDs, any stable event IDs, the full
set of exceptional statuses/results, missed-penalty markup, and the precise
normalization/statistics rules for own goals and combined yellow/red cards.
Parser output should preserve the observed facts and uncertainty; this work
does not fetch on a schedule, resolve identities, reconcile records, or write
to Sanity.

## Parser and normalization boundary

`packages/dbu` exposes pure `parseSchedule` / `parseMatch` functions and separate
`normalizeSchedule` / `normalizeMatch` functions. Cheerio is a small dedicated
HTML-parsing dependency; the code uses only its DOM loader, not network loaders.
See the [fixture manifest](../packages/dbu/fixtures/manifest.json) and
[fixture handling notes](../packages/dbu/fixtures/README.md) for capture URLs,
checksums and excerpt transformations. Parser tests work offline.

Layout or identity mismatches throw `DbuMarkupError`. Invalid optional scalar
values and unsupported event variants produce diagnostics and unknown values;
unsupported events retain their full parsed observations. Consumers must
handle these errors and diagnostics; an unavailable section (`undefined`) is
different from a present empty array. There is no authoritative deletion signal.

Normalized snapshots contain external keys and source names, not Sanity IDs,
array keys, resolved players, or reconciliation decisions. `sourceIndex` preserves
page order only and is not stable identity. Duplicate events remain separate.
Starters in explicitly completed matches have appearance evidence. Substitutes
remain unknown until identity is resolved; identical source names alone do not
establish that a timeline actor is the same person. Missing assists remain unknown.

Penalty-goal snapshots have `method: "penalty"`; plain goal icons use
`method: "unspecified"`, rather than asserting DBU has established every
non-penalty detail. The detail adapter and Studio schema now preserve that method, and player
derivation counts a verified penalty goal once as a goal. No six-/ten-metre distinction or
missed-penalty mapping is inferred. Own goals and combined yellow/red cards are
retained as unsupported variants pending domain/statistics rules.

DBU's saved pages show local dates and wall-clock times without a UTC offset.
Normalization returns an ISO calendar date plus `localTime` when known; it does
not invent a timezone or midnight for date-only data. Before persistence, Task 3
must establish the source timezone and convert to the canonical Match timestamp
with explicit daylight-saving behavior. A numeric schedule score is preserved
without treating it as proof of finality. Exceptional statuses/results outside
the observed `Færdigspillet`, `Kamp udsat` and `UDS` values remain unknown with
diagnostics. No application schema or architectural rule is changed by these
source-boundary snapshots.

Official standing-table columns, scoped identities and the applicable national
ranking rules are documented in [the standings research](dbu-standings-research.md).
The official snapshot is compared with derived match facts; it never replaces them.
