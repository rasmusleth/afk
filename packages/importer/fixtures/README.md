# Importer examples

`empty-development.json` contains a fictional Season for offline examples.
`detail-development.json` contains an example schedule snapshot for one match.
Neither is an export of a real Sanity dataset.

`batch-schedule-508399.html` is a **two-match subset**, not a full response or
current schedule. It keeps rows 602658 and 602659 from the committed
`packages/dbu/fixtures/competition-508399.html` (captured 2026-10-22), removing
all other table-body rows with Cheerio. Headers, links and retained fixture
markup come from that saved source. This makes a fully offline batch possible
using the existing individual match fixtures. See the DBU fixture manifest for
original capture provenance. Do not use this subset to refresh live data.
