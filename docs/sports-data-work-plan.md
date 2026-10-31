# Sports-data work plan

Use [architecture.md](./architecture.md) for domain and architecture decisions.
This file records implementation progress, acceptance and deferred work.
Use [the import guide](sports-data.md) for everyday commands.

## Progress and PRs

Record a PR link and status when each task reaches review. Keep the detailed
change summary, test results, and follow-up notes in the PR description. A
blank PR cell means no PR exists yet.

| Task | Status | PR | Merge date |
| --- | --- | --- | --- |
| 0. Record decisions and work plan | Merged | [#8](https://github.com/rasmusleth/afk/pull/8) | 2026-10-20 |
| 1. Sanity sports foundation | Merged | [#9](https://github.com/rasmusleth/afk/pull/9) | 2026-10-22 |
| 2. DBU fixtures and pure parsers | Merged | [#10](https://github.com/rasmusleth/afk/pull/10) | 2026-10-24 |
| 3. Full competition schedule sync | Merged | [#11](https://github.com/rasmusleth/afk/pull/11) | 2026-10-25 |
| 4. Match detail sync and reconciliation | Merged | [#12](https://github.com/rasmusleth/afk/pull/12) | 2026-10-25 |
| 5. Sports editor review experience | Merged | [#13](https://github.com/rasmusleth/afk/pull/13) | 2026-10-25 |
| 6. Derived statistics and standings | Merged | [#14](https://github.com/rasmusleth/afk/pull/14) | 2026-10-25 |
| 6a. Batch competition import | Merged | [#15](https://github.com/rasmusleth/afk/pull/15) | 2026-10-25 |
| 7. Public sports views | Merged | [#16](https://github.com/rasmusleth/afk/pull/16) | 2026-10-25 |

## Status: accepted for the current scope

The club owner closed the sports phase on 31 October 2026 after confirming
competition sync works, Studio import notices can be dismissed, and recorded
DBU assists import correctly after rerunning sync.

The final fixes are merged: [review/enrichment #19](https://github.com/rasmusleth/afk/pull/19),
[tie-breaks #20](https://github.com/rasmusleth/afk/pull/20), and
[recorded assists #21](https://github.com/rasmusleth/afk/pull/21).
The combined local verification passed 165 tests, workspace type checking and
lint. Website static export and Studio builds also passed during implementation.
This records the checks actually reported; it does not claim an exhaustive
live-data audit or completion of every earlier editor/mobile acceptance exercise.

## Accepted limits and deferred work

- Imports remain manual and development-only. Production data access, hosting,
  scheduled imports and rebuild automation belong to launch planning.
- The static website needs rebuilding after imports or Studio edits.
- Player identities require confirmation; unknown assists/appearances remain valid.
- No-shows are temporarily omitted from default ranking as agreed. Explicit
  verified counts remain supported; rare multi-team head-to-head cases stay unresolved.
- Unsupported DBU event variants remain review items; see [source notes](dbu-source-notes.md).
- Broader live-data, editor, mobile and keyboard checks remain part of website/launch QA.

## Next phase

Build the club website around the existing sports pages, starting with homepage
structure, navigation and visual direction. Agree the initial content before
adding editorial schemas; reuse the current sports model and import workflow.
