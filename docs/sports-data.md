# Sports data: DBU → Sanity

Use this guide for the normal workflow. All commands run from the repository
root, using Node 24 and pnpm 12.11.2 (`pnpm install` first).

**DBU pages → import preview → confirmed write to Sanity → editor review.**
Player statistics and standings are calculated from the saved matches. There
is no separate command to save totals. Imports are manual and currently accept
only the Sanity dataset named `development`.

## Which action do I need?

| Action | Command | What it does |
| --- | --- | --- |
| Refresh a competition (usual choice) | `pnpm sync:competition` | Imports the schedule, verifies results for all teams, and adds Aalborg lineups/events |
| Refresh the schedule only | `pnpm sync:schedule` | Updates fixtures, teams, dates, venues and available scores; does not verify every result or import lineups/events |
| Refresh one match's details | `pnpm sync:details` | Adds lineups/events to an existing match; does not refresh its score or kickoff |
| Inspect statistics | `pnpm stats:report` | Calculates player counts and standings; optionally compares with DBU; never writes |
| Edit and resolve unknowns | `pnpm studio` | Opens Sanity Studio for player links, assists, appearances and corrections |
| View the website | `pnpm dev` | Opens the website; sports data needs [separate configuration](public-sports-views.md) |

Import commands only preview unless you add `--apply` and confirm the write.
Use `--help` on any importer/report command for its options.
[Less common commands and offline examples](importer-reference.md).

## 1. Set up once

Reuse existing records and credentials if already configured.

- Open your development Studio: [setup instructions](sanity-studio.md).
- Create a **Season** with valid dates if it does not exist. Copy its document
  `_id` from Studio's document inspector; the importer needs the ID, not its name.
- Have a Sanity project token with content read/write permission. Enter it only
  at the hidden terminal prompt. Never put it in commands, environment files or chat.
  A standard token can access other datasets in the project; the CLI's development
  restriction does not limit the token's permissions.

The examples use DBU pool **508399** and Aalborg team entry **404636**. Replace
these for another competition. In a DBU URL such as
`/resultater/hold/404636_508399/kampprogram`, the first number is the team entry
and the second is the pool. The season/project placeholders below are Sanity IDs.
`Europe/Copenhagen` tells the importer how to interpret DBU's displayed times;
confirm that timezone is appropriate for your competition.

## 2. Preview a competition refresh

Replace `YOUR_SEASON_ID` and `YOUR_PROJECT_ID`, then run:

```sh
pnpm sync:competition --pool 508399 --season YOUR_SEASON_ID \
  --time-zone Europe/Copenhagen \
  --project YOUR_PROJECT_ID --dataset development \
  --club-team-entry 404636
```

Paste the token at the hidden prompt and press Enter. No visible characters is
normal. The command reads DBU and Sanity, then prints the proposed changes.
**Nothing is saved yet.**

`--club-team-entry` selects Aalborg for this run, including a first import before
the Team exists. After importing, enable **Aalborg team** on that Team in Studio.
Later refreshes can omit the flag and use the saved designation.

Read these parts of the preview:

| Field | Check |
| --- | --- |
| `summary` | Fixture count, checked/verified results and matches receiving full details |
| `creates` / `patches` | How many records will be added or updated |
| `changes` | Whether the proposed dates, scores and other facts look right |
| `review` | Conflicts or missing information needing editor attention |

Unknown players, assists and substitute appearances are expected. Investigate
unexpected changes or conflicts before writing. Repeat imports should not
duplicate records; timestamp-only updates are normal.

## 3. Save to Sanity

Run the same command with `--apply`:

```sh
pnpm sync:competition --pool 508399 --season YOUR_SEASON_ID \
  --time-zone Europe/Copenhagen \
  --project YOUR_PROJECT_ID --dataset development \
  --club-team-entry 404636 --apply
```

It reads fresh data and prints a fresh preview. Check it, then type:

```text
apply YOUR_PROJECT_ID/development
```

The combined import is saved in one transaction. If someone edited a record
in the meantime, the write is rejected; run a fresh preview. If the connection
fails during submission, check a fresh preview before retrying: the write may
already have succeeded. A saved preview cannot itself be applied.

## 4. Review in Studio

Run `pnpm studio`, then:

1. Enable **Aalborg team** on the imported Aalborg Team entry.
2. Check a completed Aalborg match and an opponent result against DBU.
3. Open **Sports review**. Link confirmed players and resolve assists or
   substitute appearances only where you know the answer.

Edits save directly. Manual corrections are protected on later imports.
Unknown information is valid; an empty field does not mean zero or no.
See [the short editor guide](sports-editor-review.md) for correction controls.

## 5. Check statistics or the website

To inspect counts and compare standings with DBU:

```sh
pnpm stats:report --competition YOUR_COMPETITION_ID \
  --rules national-futsal-men \
  --project YOUR_PROJECT_ID --dataset development --compare-dbu
```

Copy the Competition document ID from Studio. It is usually
`dbu-competition-508399` for a newly imported pool 508399. The rules option is
verified for that pool's researched regulations; check applicability before
using it elsewhere. This report only reads; it cannot save changes.
[How to interpret counts and differences](derived-statistics.md).

The website reads saved Sanity records; it does not scrape DBU. Follow
[website preview](public-sports-views.md) to connect it. Static pages need a new
build after imports or editor changes.

## When something looks wrong

- **No player statistics:** confirm Player links on participants and events;
  names alone do not identify a player. Only completed matches contribute.
- **Incomplete standings:** all teams need verified results, including
  opponent-versus-opponent matches. A schedule score alone does not prove completion.
- **A correction survives when you expected a DBU update:** use **Use DBU next
  time** in Studio, then import again.
- **Parser error or unsupported event:** inspect the source/review notice;
  do not invent missing facts or bypass the importer checks.

[Importer limits and offline examples](importer-reference.md) ·
[Architecture](architecture.md) · [DBU source evidence](dbu-source-notes.md)
