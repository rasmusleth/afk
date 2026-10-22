# Sports-data work plan

Use [architecture.md](./architecture.md) for domain and architecture decisions.
This file is a task sequence and handoff aid, not another source of truth for
the data model. Adjust later tasks when implementation reveals new facts.

## Progress and PRs

Record a PR link and status when each task reaches review. Keep the detailed
change summary, test results, and follow-up notes in the PR description. A
blank PR cell means no PR exists yet.

| Task | Status | PR | Merge date |
| --- | --- | --- | --- |
| 0. Record decisions and work plan | Merged | [#8](https://github.com/rasmusleth/afk/pull/8) | 2026-10-20 |
| 1. Sanity sports foundation | Merged | [#9](https://github.com/rasmusleth/afk/pull/9) | 2026-10-22 |
| 2. DBU fixtures and pure parsers | In review | [#10](https://github.com/rasmusleth/afk/pull/10) | — |
| 3. Full competition schedule sync | Not started | — | — |
| 4. Match detail sync and reconciliation | Not started | — | — |
| 5. Sports editor review experience | Not started | — | — |
| 6. Derived statistics and standings | Not started | — | — |
| 7. Public sports views | Not started | — | — |

## Paste-ready task prompts

Run these tasks in order unless a later discovery gives a concrete reason to
change the sequence. Each task should use a separate branch and a reviewable
PR. The agent should inspect the current repository and the relevant Next.js
guide before writing Next.js code, as required by `AGENTS.md`.

The first prompt assumes the documentation changes from this conversation are
present in the checkout. Finish and merge that PR before starting a new
worktree from `main` for Task 1.

### Task 0 — Record decisions

```text
Continue the local documentation changes in docs/architecture.md and
docs/sports-data-work-plan.md. Review them against AGENTS.md and our agreed
decisions: Team is a playing side; Competition belongs to a Season; sports
edits take effect directly; starters count as appearances in completed
matches; substitutes remain unknown without evidence; the full competition
schedule is the discovery source; competition-specific points adjustments
represent rulings; and administrators review identity conflicts, important
import discrepancies, unknown Aalborg assists, and substitute appearances.
Keep the documents concise and consistent, make no application changes, and
open a PR. Record checks in its description and its link in the tracker.
```

### Task 1 — Sanity sports foundation

```text
Read AGENTS.md and docs/architecture.md, then implement the initial Sanity
Studio and sports-data schemas for Season, Competition, Team, Player, and
Match. Include embedded participant and typed event objects, competition
points adjustments, external identity/import metadata, and field-level
override metadata. Give normal editors a clear form and keep technical
metadata out of their way. Sports records should take effect directly,
without a review-and-publish workflow. Add meaningful validation and tests
for domain invariants. Do not implement DBU fetching or synchronization in
this PR. Run relevant checks, document any unresolved setup needs, open a PR,
and update the tracker with its link.
```

### Task 2 — DBU fixtures and pure parsers

```text
Read AGENTS.md and docs/architecture.md. Inspect the actual DBU full
competition schedule and representative completed match pages, including
examples of goals, cards, and penalties when available. Save representative
HTML fixtures. Implement and test pure parsing and normalization functions
for only the fields the markup supports. Preserve unknown values and source
names, and document which DBU identifiers were actually observed. Do not
write to Sanity in this PR. Run relevant checks, open a PR, and update the
tracker with its link.
```

### Task 3 — Full competition schedule sync

```text
Read AGENTS.md and docs/architecture.md. Implement schedule synchronization
from the full DBU competition schedule into Sanity: competition identity,
team entries, fixtures, status, venue, kickoff, and official score. Keep
fetching, parsing, normalization, reconciliation, and persistence separate.
Use stable source IDs where verified, preserve manual corrections, and make
repeat syncs idempotent. Cover fixture changes and missing source data with
tests. Do not import lineups or events in this PR. Run relevant checks, open
a PR, and update the tracker with its link.
```

### Task 4 — Match detail sync and reconciliation

```text
Read AGENTS.md and docs/architecture.md. Import participants and supported
typed events from saved DBU match-detail fixtures, prioritizing Aalborg
matches. Treat starters in completed matches as appearances; leave listed
substitutes unknown unless there is evidence they played. Match imported
events conservatively, preserve their Sanity _key values and manual
enrichment, and flag ambiguous or disappearing events rather than deleting
them. Do not guess unsupported penalty or card markup. Add tests for
repeated imports, conflicts, and incomplete data. Run relevant checks, open
a PR, and update the tracker with its link.
```

### Task 5 — Sports editor review experience

```text
Read AGENTS.md and docs/architecture.md. Build the Studio workflow for
resolving uncertain player identity, unknown Aalborg assists, and substitute
appearances, plus important import discrepancies. Make each review item
explain the reason and link to the affected match item. Record manual
field-level overrides through the editing workflow, without asking editors
to manage technical flags; clearing an override should allow a later sync
to supply the source value. Unknown values must
remain valid and must not block import. Keep technical import controls away
from ordinary editors. Test the behavior that protects manual changes, run
relevant checks, open a PR, and update the tracker with its link.
```

### Task 6 — Derived statistics and standings

```text
Read AGENTS.md and docs/architecture.md. Implement pure derivation of
player appearances, goals, assists, and cards from canonical match data.
Calculate the competition table from official match results plus explicit
team-specific signed points adjustments, with a way to compare the result
against DBU's official standing and flag differences. Handle unknown data
honestly and do not store independently editable totals on Player or Team.
Test incomplete events, unresolved substitutes, and points adjustments.
Run relevant checks, open a PR, and update the tracker with its link.
```

### Task 7 — Public sports views

```text
Read AGENTS.md and docs/architecture.md. Add public fixtures, results,
league table, and Aalborg player views using the existing Sanity data and
derived statistics. Keep the site compatible with the architecture's static
deployment goal. Clearly distinguish unknown information from a confirmed
zero or absence. Focus this PR on sports presentation; do not expand into
unrelated editorial pages. Verify the relevant pages and checks, open a PR,
and update the tracker with its link.
```

## What to put in each PR

Keep the description short but specific: the intended behavior, the main
design decision, checks run and their results, any data-migration or import
risk, and follow-up work. Link the task and update the table above once the PR
exists. Review a PR against both the task and `docs/architecture.md` before
merging. If an architecture decision changes, update `docs/architecture.md`
in the same PR and explain why.

## Input to provide when it becomes relevant

- **Task 1:** The Sanity project ID, dataset name, and intended Studio hosting
  location if they already exist. If they do not, let the agent identify the
  smallest setup needed and explain the choice before connecting production
  content.
- **Tasks 2 and 4:** Any DBU match links you find with missed penalties,
  penalty goals, or unusual cards. The agent should also search for and
  inspect examples; missing examples should leave the mapping unimplemented,
  not guessed.
- **Task 5:** Try the first review screen with a real Aalborg match and say
  which unresolved facts are useful to see first. Tune the queue from actual
  editor use rather than specifying every filter now.
- **Tasks 6 and 7:** Decide whether the public table should display an
  explanation for each points adjustment and how much opponent player detail
  should appear. These choices do not block earlier tasks.
