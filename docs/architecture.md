# Futsal Club Website — Architecture

## Project goal

Build a website for Aalborg Futsal Klub.

The site will contain normal editorial/marketing content such as news,
club information, sponsors, teams, etc., but will also contain structured
sports data:

- fixtures
- results
- players
- player profiles
- match events
- player statistics
- team/season statistics

The sports data primarily comes from DBU and will be imported automatically,
but club admins must be able to enrich or correct imported match data through
Sanity Studio.

The expected statistics scope is intermediate rather than a full analytics
platform: appearances, goals, assists, cards, player profiles, season totals,
top scorers, etc.

# Technology decisions

## Frontend

Use Next.js.

The initial goal is for the public website to be statically deployable,
potentially using Next.js static export, so it can run on simple static
hosting.

Do not design the application around requiring a persistent Next.js server.

Content that changes frequently may later be fetched client-side from Sanity
if necessary.

Static rebuilds may also be triggered when Sanity content changes.

The scraper/importer is independent of the public frontend and does not need
to run on the same hosting.

## CMS / datastore

Use Sanity as the initial CMS and datastore.

Do NOT introduce PostgreSQL initially.

Sanity should contain both:

1. Editorial content
   - news
   - club information
   - sponsors
   - team descriptions
   - etc.

2. Sports data
   - seasons
   - competitions
   - teams
   - players
   - matches
   - match participants
   - match events

PostgreSQL may be reconsidered later if the statistics/querying requirements
become significantly more complex.

Avoid introducing PostgreSQL/Directus preemptively.

## Repository layout

Use one pnpm workspace and lockfile with separate application packages:

- `apps/web`: the public Next.js website, its assets and app configuration.
- `apps/studio`: the standalone Sanity Studio, schemas and Studio configuration.
- `packages/sports`: shared TypeScript domain models and pure validation,
  independent of Next.js, React and Sanity runtime dependencies.
- `packages/dbu`: source-specific pure HTML parsing and normalization, with
  saved fixtures and external-identity snapshots; no fetching or persistence.
- `packages/importer`: server-only manual schedule and match-detail synchronization, with public
  fetching, reconciliation, revision-checked Sanity persistence and read-only reporting.

Each app owns its runtime dependencies and local environment files. The root
contains workspace commands, shared development tooling and documentation.
Studio imports the sports package through `workspace:*`; the public site and
future importer can use that same domain package when needed. The apps build
and run separately, and the website does not require Studio configuration.

# Core sports-data principle

## Matches are the source of truth

Player statistics must NOT be manually stored as totals on Player documents.

For example, do not maintain:

- player.totalGoals
- player.totalAssists
- player.appearances
- player.yellowCards

as independently editable statistics.

Statistics should be derived from match data.

Examples:

- goals = matching goal events
- assists = goal events where player is the assister
- cards = matching card events
- appearances = match participation data

This avoids duplicated state and synchronization problems.

Competition standings are a narrow exception to deriving every displayed
number from matches. A competition may have a team-specific points adjustment
for a disciplinary ruling or another decision outside a match. Store each
adjustment as an explicit fact with a signed points change, reason, and source
when available. Apply it only to the competition whose table it affects; a
ruling originating in a previous season may affect the current competition.
Do not store an independently editable total of points on Team documents.

# Event-driven match model

Match events represent facts that occurred during a match.

Examples:

- goal
- yellow card
- red card

Support a distinction between an ordinary goal and a penalty goal, and a
separate missed-penalty event when the source data establishes those facts.
Inspect DBU examples before finalizing penalty variants or mappings.

Goal events should be capable of representing at least:

- scorer
- team
- minute, when known
- assister, when known
- assist state if necessary

Example conceptual event:

{
type: "goal",
team: <Team reference>,
scorer: <Player reference>,
assist: {
  status: "credited" | "none" | "unknown",
  player: <Player reference, when credited and identified>
},
minute: 16
}

Prefer typed event structures rather than a generic object with many unrelated
optional fields.

Represent an assist as credited to a player, known to have none, or unknown.
Do not turn a missing DBU assist into a known absence of an assist.

# Match score

The official/final score is a match-level fact.

Do NOT require the score to be calculated exclusively from known goal events.

For example, DBU may tell us a match finished 2–6 even if some detailed event
information is missing.

Therefore:

match.score.home
match.score.away

should contain the known official score.

Player goal statistics should still be derived from known goal events.

This allows the system to represent incomplete event data honestly.

# Participants / lineups

Appearances cannot be derived from events alone because a player may play
without recording an event.

Matches therefore need participation/lineup data separately from events.

DBU currently exposes starting players and substitutes.

Conceptually:

Match
participants / squads
team
player
shirtNumber
lineupStatus

Possible lineup states include:

- starter
- substitute

Do not assume that being listed as a substitute proves that the player entered
the match.

Unknown and false are different states.

For example, if DBU lists a player as a substitute but provides no evidence
that they played, appearance status may be unknown rather than false.

An event involving a substitute is evidence that the player participated.

For a completed match, being listed as a starter is sufficient evidence of an
appearance. Being listed as a substitute alone is not. An administrator must
be able to resolve an unknown substitute appearance to played or did not play.

Shirt numbers should be stored at match-participation level because numbers
may change between matches/seasons. A Player may separately have a current or
default number if useful.

# Missing vs zero / false

Preserve the distinction between unknown information and a known negative or
zero value.

Examples:

assists = unknown
is NOT equivalent to
assists = 0

appearance = unknown
is NOT equivalent to
appearance = false

This principle should be reflected in schemas and importer behavior.

# DBU integration

Primary source:

https://dbu.dk/

See [DBU source observations](./dbu-source-notes.md) for verified markup,
fixture provenance, supported mappings and remaining normalization questions.

Example Aalborg season schedule:

https://dbu.dk/resultater/hold/404636_508399/kampprogram

Example completed matches:

https://dbu.dk/resultater/kamp/602659_508399/kampinfo

https://dbu.dk/resultater/kamp/602665_508399/kampinfo

Full competition schedule and standing:

https://dbu.dk/resultater/pulje/508399/kampprogramFuld

https://dbu.dk/resultater/pulje/508399/stilling

Discover fixtures from the full competition schedule so all teams and results
are available for a league table. Aalborg matches remain the first priority
for detailed player data and manual review.

The schedule provides basic match information such as:

- DBU match number
- date/time
- home team
- away team
- venue
- status
- result when played

The individual match page provides more detailed information such as:

- lineup
- substitutes
- shirt numbers
- officials
- match timeline/events

Event types may be represented by icons/images in DBU's HTML rather than
explicit textual labels. Inspect the actual HTML attributes, image URLs,
classes, alt text, or related markup before defining event mappings.

The full schedule currently links team entries using URLs such as
`/resultater/hold/404636_508399`. The first number appears to identify the
team entry and the second the competition pool; verify these meanings and do
not assume the team entry number is stable across seasons. In the two example
match pages above, player names in lineups and events appear as plain text
without visible player IDs or profile links. Preserve source names and do not merge
Player documents based on names alone. Recheck these observations against
saved HTML fixtures when implementing the importer.

# External identity

DBU match numbers are stable external identifiers and should be stored.

Example:

602659
602665

Keep DBU identity separate from Sanity identity.

Conceptually:

external: {
source: "dbu",
matchNumber: "602659"
}

Sanity document IDs and array `_key` values remain our internal identifiers.

Do not derive Sanity identity directly from mutable display values such as
player names.

Where no reliable DBU player ID is available, preserve the source name and
team on match data. Link it to a Player document only when identity is
sufficiently certain; ambiguous matches need administrator review.

# Importer structure

Keep schedule synchronization and detailed match synchronization conceptually
separate.

For example:

syncSchedule()
syncMatchDetails(match)

syncSchedule() is responsible for:

- discovering matches
- creating missing matches
- date/time
- teams
- venue
- status
- official score
- detecting fixture changes

syncMatchDetails() is responsible for:

- participants
- starting lineup
- substitutes
- shirt numbers
- events
- detailed match information

Do not build one large scraper function that mixes discovery, parsing,
normalization, reconciliation, and persistence.

A manual competition batch may orchestrate these existing modules without
combining their responsibilities. It refreshes the full schedule, then checks
scored or previously scored/completed fixtures against their individual match
pages. A new completed result requires explicit completion and a complete
non-negative official score on that page; a numeric score or past date alone
never establishes completion. Unverified new results are withheld, existing
local facts retained, and discrepancies flagged for review.

By default, participants and events are parsed only for fixtures involving a
Team explicitly designated as an Aalborg team in that pool (or an explicit DBU
team entry supplied by the operator). Other fixtures receive result checks only.
Full details for every selected fixture require an explicit option.

Verified result observations feed schedule reconciliation before detail plans
are staged in memory. The final transaction has at most one mutation per
document, guards every patch with its original revision, and preserves manual
overrides and embedded keys. Fetch/parse failures abort the whole batch; missing
stored fixtures are retained for review. Initial bounds are 100 match pages,
500 mutations and 4 MB per transaction, without partial commits or automatic
retries. See [the batch guide](./dbu-batch-sync.md).

# Import metadata

Store synchronization/import metadata in Sanity alongside the entities it
describes.

Do NOT introduce another database solely for scraper state.

Match-level metadata may contain fields such as:

external: {
source: "dbu",
matchNumber: "...",
firstImportedAt: "...",
lastScheduleSyncAt: "...",
lastDetailSyncAt: "..."
}

Most synchronization metadata should be hidden or read-only for ordinary
Sanity Studio editors.

The initial sports-data workflow has no review-and-publish approval step.
Import directly to published sports documents and configure sports editing to
take effect directly. Keep the public read model tolerant of incomplete
records, and enforce importer integrity rules in code as well as Studio
validation. Editorial content may use a different publication workflow.

# Imported events and internal event identity

DBU appears to provide stable match IDs but no obvious stable event IDs.

Imported events should therefore receive our own stable Sanity `_key`.

Once an event has been created, subsequent imports should attempt to reconcile
the scraped event with the existing event rather than deleting/recreating the
event.

Potential matching information may include:

- event type
- team
- player
- minute
- occurrence/order

Do not assume these always form a globally unique identifier.

For example, one player can score multiple goals and event minutes may be
missing.

Reconciliation should therefore be conservative when identity is ambiguous.

# Import ownership and manual editing

The importer and Sanity admins both modify match data.

The importer must NEVER blindly overwrite manual corrections/enrichment.

Avoid a single coarse:

hasBeenEdited: true

flag for an entire match/event.

Prefer field-level ownership/override information where necessary.

## Schedule field baselines

Schedule synchronization records hidden per-field fingerprints in
`import.scheduleBaseline`. Compare local values with the last accepted local
baseline before applying source changes. A divergence becomes a field override;
legacy values without baselines and manually owned records are preserved
conservatively. Missing source values never erase known local information.
Record the retained local value as the new baseline while preserving the
override, so clearing that override allows a subsequent sync to supply the field
again when there has been no newer local edit. Revision-checked patches and
atomic creates prevent stale plans from overwriting concurrent editor changes.

The initial manual importer supports only the `development` dataset and requires
an explicit source IANA timezone assertion; DBU's timezone contract is unverified.
Reject ambiguous/nonexistent wall times, and keep numeric schedule scores
separate from unverified completion status. See
[schedule sync](./dbu-schedule-sync.md) for its limits and execution workflow.

## Detail reconciliation baselines

Match detail sync records separate `detailBaseline` field fingerprints on
embedded facts and a source `detailSignature` for exact observation matching.
Signatures identify observations for reconciliation, not confirmed people or
external event identities. Preserve internal keys and manual enrichment; retain
changed/disappearing observations and flag ambiguity instead of guessing a
replacement. Match-level `detailKeys` detect local array removals. Repeated
identical events retain keys by occurrence only with unchanged multiplicity and
remain flagged. Schedule and detail baselines/timestamps do not replace each
other. See [detail sync](./dbu-match-details.md) for execution and limitations.

Verified DBU penalty-goal markup now supports an optional goal `method` of
`penalty` or `unspecified`. No absence of a penalty marker proves an ordinary
goal; missed penalties and own-goal credit remain unmapped.

## Manual enrichment

Example:

DBU imports:

goal:
scorer: Player A
assist: unknown
minute: 16

An admin later supplies:

assist: Player B

A future DBU scrape that still lacks assist information must NOT erase the
admin-supplied assist.

General rule:

Missing information from DBU must not overwrite known information in Sanity.

## Manual correction

Example:

DBU says scorer = Player A.

Admin determines this is incorrect and changes scorer to Player B.

The system needs to know that scorer has been explicitly overridden.

Conceptually an imported event may contain metadata such as:

import: {
origin: "imported",
lastSeenAt: "...",
overrides: ["scorer"]
}

Future imports may update non-overridden imported fields but must preserve the
manual scorer correction.

Editors should not have to manually manage technical override flags if this
can reasonably be automated by the Studio editing workflow.

Initially, removing an override allows the next successful DBU sync to supply
that field again. A one-click restoration of the latest imported value is not
required until editor use shows a need for it.

Start with a small trusted group of sports editors and a separate importer
credential. Hiding or making import fields read-only in Studio improves the
editor experience, but must not be treated as the only protection for imported
data.

# Manual events

Admins may add events that DBU does not contain.

Events should therefore distinguish their origin:

origin: "imported"
origin: "manual"

The scraper must never remove a manual event simply because DBU does not
contain it.

# Destructive synchronization

The importer should be conservative.

Adding newly discovered information is generally safe.

Removing existing information because it disappeared from scraped HTML is not
automatically safe.

A disappearance could mean:

- DBU corrected its data
- DBU temporarily changed the page
- the parser failed
- the markup changed

Therefore do not blindly delete existing imported events when they disappear
from a scrape.

Prefer retaining/flagging discrepancies until there is sufficient confidence
to reconcile them safely.

# Event reconciliation

Because DBU does not appear to expose event IDs, event reconciliation needs
special care.

Potential event fingerprints may use:

type + player + team + minute

but this must not be treated as universally unique.

Our Sanity `_key` is the persistent internal identity once an event has been
created.

Future imports should preserve that `_key`, particularly because admins may
have enriched that event.

# Data quality

The official score and known events allow useful consistency checks.

Example:

official score:
Aalborg 2
København 6

known goal events:
Aalborg 2
København 5

This should not cause the importer to invent another København goal.

Instead it means event information is incomplete.

The system may eventually surface warnings such as:

"Final score indicates 6 goals but only 5 goal events are currently known."

Similar checks can identify incomplete information requiring admin enrichment.

Surface actionable exceptions in an administrator review queue. Prioritize
ambiguous player identity, event reconciliation, score discrepancies, and
conflicts with manual corrections. For Aalborg matches, also surface unknown
assists and substitute appearances. Unknown information is valid and should
not block import; the queue helps administrators improve completeness.

The official DBU standing can be compared with the table derived from match
results and competition-specific points adjustments. A mismatch is a signal
to investigate a missing ruling or competition rule, not a reason to silently
overwrite match facts.

# Sports editor review

The Studio Sports review tool derives current uncertainty from match facts,
prioritizing explicitly designated Aalborg Team entries (`isClubTeam`) and
import discrepancies. Names never establish club/player identity. Stable keyed
paths link to the affected participant/event field. Resolved dynamic uncertainty
leaves the queue; structural import notices remain until checked and can be
raised again by a later sync. Review is not a publication gate.

Imported-field edits record overrides in the normal form patch. Releasing a
correction first accepts the current local fingerprint so the next successful
sync can supply that field even before an intervening import. Array removal
releases also accept current keys. Metadata remains hidden; editors use field
labels and normal reference/assist/appearance controls. See the
[editor guide](./sports-editor-review.md) for behavior and manual verification.

# Derived statistics

Statistics should be calculated from canonical match data.

Examples:

Player goals:
count goal events where scorer == player

Player assists:
count goal events where assist == player

Yellow/red cards:
count corresponding card events

Appearances:
derive from participation information only when participation is sufficiently
known.

Season/player/team statistics should not become separate manually maintained
sources of truth.

The initial derivation API returns confirmed `known*` player counts with
separate per-player unknown appearances and per-match/team coverage. Unresolved
source names never become identities; absent sections and unknown assists do
not become exhaustive zeroes. Season membership follows Competition references.
Only completed-match facts contribute; official table results additionally need
a complete official score. Duplicate/invalid inputs produce diagnostics.

Standings use explicit caller-supplied scoring/ranking rules. The verified
national men's futsal profile uses 3/1/0 points and no-show-first tie breaking.
No-show facts are unavailable in our current model, so tied points stay shared
unless a caller supplies verified counts. Unverified multi-team head-to-head
interpretations stay unresolved. Competition points adjustments remain explicit
facts, including reasons and sources. Official standings are comparison-only
snapshots resolved by scoped external identity, never replacement totals or
inferred rulings. See [the statistics guide](./derived-statistics.md) and
[DBU rule research](./dbu-standings-research.md) for verified behavior and limits.

# Initial core entities

Expected Sanity domain model:

Season
Competition
Team
Player
Match

Team means a playing side or competition entry in the initial model. It is
not the wider club organization. A Club document can be added later and
referenced by teams if needed.

Competition belongs to one Season. Match references Competition; its season
is derived through that reference rather than stored twice.

Participants and typed events are objects embedded in Match arrays, with
persistent Sanity `_key` values. Player and Team are separate documents
referenced from those objects when their identities are known.

The initial schema should cover these fields (exact editor labels and code
names can be refined during implementation):

| Document | Core fields |
| --- | --- |
| Season | Name, start date, end date |
| Competition | Name, Season reference, DBU pool identity, points adjustments |
| Team | Name, optional short name, scoped DBU team-entry identity |
| Player | Name, optional public profile content, optional verified external identity |
| Match | Competition reference, home and away Team references, kickoff/date precision, venue, status, official score, participants, events, import metadata |

A points adjustment is an object on Competition with a Team reference,
signed integer points change, reason, and optional source and originating
season. Multiple adjustments for one team must be possible. Each should have
its own stable `_key`.

A participant has a Team reference, optional Player reference, preserved
source player name when applicable, match shirt number, lineup status
(starter, substitute, or unknown), and appearance state (played, did not
play, or unknown). A missing Player reference must not discard the source
name or create a confirmed identity from a name match alone.

The first typed events are goal, yellow card, and red card. Each has a Team,
optional resolved Player and preserved source player name, and an optional
minute. Goals have an explicit assist state and optional assister. Only add
penalty details to the schema once representative DBU markup has been
inspected. Imported participants and events need an origin and reconciliation
metadata; manual events remain separate from imported ones.

At minimum, validate required names and references, Season date order,
distinct home and away teams, complete non-negative official scores, valid
event-specific fields, and duplicate resolved participants within a team.
Incomplete event coverage and unknown assists or appearances are warnings or
review items, not invalid records. Apply equivalent integrity checks in the
importer because Studio schema validation does not govern API writes.

Match contains or references:

- external/import metadata
- competition
- date/time
- venue
- status
- home team
- away team
- official score
- participants/squads
- events

# Current architectural priorities

Optimize for:

1. correctness of canonical match data
2. preserving manual admin work
3. simple admin UX
4. traceable imports
5. maintainable importer logic
6. simple infrastructure
7. ability to derive player/season statistics later

Do not prematurely optimize for:

- massive scale
- complex analytics
- PostgreSQL
- microservices
- real-time synchronization
- storing precomputed statistics everywhere

# Open implementation questions

These should be investigated rather than guessed:

1. Exact DBU HTML structure for penalty, red-card, and any additional event
   types; save representative fixtures before defining mappings.
2. Whether DBU team-entry IDs persist across seasons, and whether another
   reliable player identifier exists outside the two inspected match pages.
3. Full set of match status codes and exceptional result rules.
4. Best event reconciliation strategy when no event ID exists.
5. Further editor feedback on the Studio review workflow, especially resolving
   uncertain source-event replacements without losing enrichment.
6. How frequently schedule/detail synchronization should run.
7. Verified no-show facts, historical rule versions and multi-team head-to-head
   subgroup interpretation needed to resolve every official placement.
