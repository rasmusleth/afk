# Manual development competition batch

Use this workflow to refresh the full schedule, verify reported results for all
clubs, and import Aalborg match details in one command. It fills the result
coverage needed by the derived standings without importing player details for
every club. It is a manual development tool; nothing runs on a schedule.

## 1. Check the existing setup

Run commands from the repository root after `pnpm install`, using Node 24 and
the pinned pnpm version. You need your Sanity project ID, the **published Season
ID** covering this competition, and the `development` dataset. Use the same
values as your successful schedule import. Season records must already exist.

In Studio, open the Aalborg Team entry for this competition and enable **Aalborg
team** if it is not already enabled. The default batch selection uses this flag
and DBU pool identity, never the display name. For a first import with no Team
record, add `--club-team-entry 404636` for pool 508399 instead. This selects the
entry for this run; it does not set the Studio flag for you. Other pools may use
a different team entry ID.

Reuse your existing importer credential and hidden terminal prompt. No new
credential, environment variable or dashboard setup is needed. Do not put a
token in command arguments, plan JSON or committed files. Standard Sanity Editor
tokens can be project-wide: the CLI's development-only guard is not a credential
permission boundary. See [credential handling](./dbu-schedule-sync.md).

## 2. Preview current data

Replace both placeholders, then run:

```sh
pnpm sync:competition --pool 508399 --season YOUR_PUBLISHED_SEASON_ID \
  --time-zone Europe/Copenhagen \
  --project YOUR_PROJECT_ID --dataset development
```

Enter your credential at the hidden terminal prompt. This reads Sanity and public
DBU pages, then prints a JSON preview; it does not write to Sanity. Progress goes
to stderr. To save clean JSON without package-manager output, invoke the CLI
directly from the root and redirect stdout:

```sh
node packages/importer/batch-cli.ts --pool 508399 --season YOUR_PUBLISHED_SEASON_ID \
  --time-zone Europe/Copenhagen \
  --project YOUR_PROJECT_ID --dataset development > /tmp/afk-competition-plan.json
```

The file appears after the reads complete. Keep terminal input available for the
hidden prompt. This JSON is a report, not a file that can later be applied.

Inspect:

- `summary.scheduleMatches`: all discovered fixtures, including upcoming games.
- `summary.checked`: fixtures with source/local scores or completed status that
  were checked against their own match pages; `verified` requires explicit
  completion and a complete official score, including 0–0.
- `summary.detailedMatchIds`: verified Aalborg fixtures receiving participants
  and events, including both sides of each fixture.
- `creates`, `patches`, `changes` and `review`: proposed changes and conflicts.
  Unresolved player identity, unknown assists and substitute appearances remain
  review items. Scores do not have to match the event count.

A numeric schedule result or a past kickoff never proves completion. If the
match page does not verify completion and score together, the batch withholds
that new result, retains existing local facts and flags review. If verified
match-page and schedule scores disagree, the match-page score is proposed and
flagged; protected manual values still win. A protected non-completed local
status prevents played-match details from being imported.

## 3. Apply, then inspect Studio

Run the same command again with `--apply` appended. It fetches fresh sources and
a fresh snapshot, shows a fresh preview, then asks you to type exactly:

```text
apply YOUR_PROJECT_ID/development
```

One atomic transaction writes the combined plan. Every existing document uses
its original revision guard, so concurrent editor changes require a fresh run.
There are no writes during fetching or staging. A network error during submission
can leave the outcome uncertain: inspect a fresh dry-run before retrying.

Open Studio and check a verified opponent fixture and an Aalborg fixture. The
opponent fixture should have an official score/completed status; the Aalborg
fixture should also have lineup/events. Existing player links, assists, manual
corrections and embedded keys are preserved. Resolve important source conflicts
through the existing Sports review tool.

Run your existing [statistics report](./derived-statistics.md) again. More complete
results should reduce `unverified-result` issues. A batch does not resolve
no-show rulings, points adjustments, unresolved identities or unsupported events,
and does not write derived standings or player totals to Sanity.

## Scope and failure limits

- Default `--details club`: full details for selected Aalborg fixtures and
  result-only checks for other selected fixtures.
- `--details none`: result checks only, with no club designation needed.
- `--details all`: full details for every verified selected fixture. This can
  generate many identity review items. Do not combine either option with
  `--club-team-entry`.
- Match pages are fetched sequentially, with the existing DBU-only HTTPS,
  redirect, timeout and response-size limits. At most 100 match pages are checked.
- The whole transaction must fit 500 mutations and 4 MB. Oversized plans stop
  before confirmation; they are not split into partially applied chunks.
- A missing page, changed required markup, identity mismatch or blocking
  normalization error aborts the whole batch. Result-only checks skip irrelevant
  lineup/event markup. Unsupported detailed events remain review items.
- Fixtures missing from the schedule are retained and flagged. Nothing is
  deleted, no automatic retries run, and no production target is accepted.
- Upcoming fixtures without score/completion evidence are refreshed from the
  schedule, but their individual pages are not polled. This is not a live updater.

If a bound is exceeded or markup changes, preserve the error and inspect the
source before changing the tool. Do not work around a bound by blindly retrying.

## Fully offline example

This uses a documented two-match subset of the saved October schedule. It
creates a plan for two verified results, with details only for match 602659:

```sh
node packages/importer/batch-cli.ts --pool 508399 --season season-example \
  --time-zone Europe/Copenhagen \
  --html packages/importer/fixtures/batch-schedule-508399.html \
  --match-html-dir packages/dbu/fixtures \
  --existing packages/importer/fixtures/empty-development.json \
  --club-team-entry 404636 > /tmp/afk-competition-example.json
```

Offline mode requires every selected `match-NUMBER.html` file and never falls
back to downloading a missing file. It cannot apply or access Sanity. Never use
this historical schedule subset for a connected refresh.

Implementation was verified with saved HTML, synthetic snapshots and mocked
Sanity transport. No authenticated dataset read or write was performed. The
remaining manual check is the connected preview/apply against your development
data after review and merge; your existing project, Season and credential setup
are sufficient.
