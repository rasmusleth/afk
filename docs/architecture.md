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

# Event-driven match model

Match events represent facts that occurred during a match.

Examples:

- goal
- yellow card
- red card

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
assist: <Player reference | null>,
minute: 16
}

Prefer typed event structures rather than a generic object with many unrelated
optional fields.

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

Example Aalborg season schedule:

https://dbu.dk/resultater/hold/404636_508399/kampprogram

Example completed matches:

https://dbu.dk/resultater/kamp/602659_508399/kampinfo

https://dbu.dk/resultater/kamp/602665_508399/kampinfo

The Aalborg schedule page can be used as the discovery/index source for
matches.

The DBU competition schedule may alternatively be used if league-wide results
are needed.

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

Also inspect team/player links and underlying HTML for stable DBU identifiers.
Prefer stable DBU IDs over matching entities by name whenever available.

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

# Initial core entities

Expected Sanity domain model:

Season
Competition
Team
Player
Match

Match contains or references:

- external/import metadata
- competition
- season
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

1. Exact DBU HTML structure for each event type.
2. Whether DBU exposes stable player IDs in links/markup.
3. Whether DBU exposes stable team IDs in links/markup.
4. Full set of DBU event types relevant to futsal.
5. Full set of match status codes.
6. Best event reconciliation strategy when no event ID exists.
7. Best Sanity Studio UX for automatically recording manual overrides.
8. Whether Aalborg's team schedule or the full competition schedule should be
   the primary discovery endpoint.
9. How frequently schedule/detail synchronization should run.
