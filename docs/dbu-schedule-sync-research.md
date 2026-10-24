# DBU schedule synchronization: source limits

Investigated 24 October 2026, building on [the parser source notes](./dbu-source-notes.md).
This research used public DBU pages only. It did not access Sanity, credentials,
or authenticated DBU content.

## Scores and status

The [pool 508399 schedule](https://dbu.dk/resultater/pulje/508399/kampprogramFuld)
contains independent numeric home/away score elements. In the inspected HTML,
match 602659 has 4–3 without a status label, whereas match 602678 has `UDS`
and the exact tooltip `Kamp udsat`. On 24 October, 602675 has acquired a 2–5
score; the earlier saved fixture had empty scores. Neither version supplies
an explicit completion label in that row. The inspected numeric score rows
have no attribute that certifies finality. This is a markup observation,
not proof about all DBU schedules.

The [602659 detail page](https://dbu.dk/resultater/kamp/602659_508399/kampinfo)
does explicitly display `Færdigspillet`. Its completion evidence belongs to
that detail snapshot; it must not be generalized to every numeric schedule
result or inferred from the elapsed fixture date.

DBU's [result-reporting guide](https://www.dbu.dk/turneringer-og-resultater/kampe-og-baner/indberetning-af-resultater/)
describes manual result submissions and corrections by the reporter within
an hour, or by the local union later. [Klubservice's result and match-facts guide](https://klubservice.dbu.dk/fodbold-app/floating-menu/burgermenu/kampe-turneringer/indberet-resultat-og-kampfakta/)
distinguishes livescore during a match from match facts after it. Its
[extra-time/shootout guide](https://klubservice.dbu.dk/fodbold-app/floating-menu/burgermenu/kampe-turneringer/livescore/indberet-livescore-kamp-med-forlaenget-spilletid-og-eller-straffe/)
also explains that result submission is separate from livescore. None of
these guides specifies that a numeric score on the schedule certifies finality.

**Implementation recommendation:** preserve numeric scores as observed facts,
but retain unknown status when there is no recognized explicit label. Map
the observed `UDS` / `Kamp udsat` to postponed and the observed
`Færdigspillet` to completed only where actually supplied. Do not synthesize
completion from the score, kickoff date, or a guessed grace period. Retain
unknown labels and diagnostics for investigation. Schedule-only imports
therefore may not yet provide enough status evidence for standings.

## Fixture timezone

The [schedule](https://dbu.dk/resultater/pulje/508399/kampprogramFuld) displays
calendar dates and wall-clock times such as `27-09 2026` and `13:00` without
an offset or named timezone. The [match detail](https://dbu.dk/resultater/kamp/602659_508399/kampinfo)
likewise displays `27-09-2026` and `Kl. 13:00`. Neither establishes an IANA
timezone in the inspected markup.

The schedule's publicly linked [frontend bundle](https://dbu.dk/scripts/bundled.min.js?d=639282881501695519)
was also inspected. `MatchProgramMatchClick` navigates to a match URL; other
code relocates score/status blocks into match information and reloads pages
marked live every 60 seconds. No `timeZone`, `timezone`, `utcOffset`, or
`toISOString` declaration was located in that bundle. This limited negative
inspection does not prove that DBU has no timezone convention elsewhere.
Targeted first-party documentation searches did not establish the timezone
contract for these domestic schedule pages. Articles explicitly describing
international kickoff times in Danish time do not establish this contract.

**Implementation recommendation:** require the operator to provide an explicit
IANA timezone assertion, for example `--time-zone Europe/Copenhagen`, before
converting known source wall-clock times into timestamps. Document this as
an operator assertion, not a verified DBU guarantee. Do not use the execution
host's timezone or append `Z` to a local time. Apply the selected zone's
daylight-saving rules; reject nonexistent or ambiguous wall-clock times
rather than silently moving them. Preserve date-only precision without
inventing midnight.

## Follow-up evidence needed

- An authoritative timezone contract for domestic DBU fixture times.
- An explicit schedule-level finality signal or documented result semantics.
- Additional exact labels and result rules for exceptional match outcomes.

Until those are verified, the conservative choices above preserve the source
facts without claiming more certainty than the current evidence supports.
