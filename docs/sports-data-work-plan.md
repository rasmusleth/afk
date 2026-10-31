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
| 2. DBU fixtures and pure parsers | Merged | [#10](https://github.com/rasmusleth/afk/pull/10) | 2026-10-24 |
| 3. Full competition schedule sync | Merged | [#11](https://github.com/rasmusleth/afk/pull/11) | 2026-10-25 |
| 4. Match detail sync and reconciliation | Merged | [#12](https://github.com/rasmusleth/afk/pull/12) | 2026-10-25 |
| 5. Sports editor review experience | Merged | [#13](https://github.com/rasmusleth/afk/pull/13) | 2026-10-25 |
| 6. Derived statistics and standings | Merged | [#14](https://github.com/rasmusleth/afk/pull/14) | 2026-10-25 |
| 6a. Batch competition import | Merged | [#15](https://github.com/rasmusleth/afk/pull/15) | 2026-10-25 |
| 7. Public sports views | Merged | [#16](https://github.com/rasmusleth/afk/pull/16) | 2026-10-25 |

## Remaining acceptance checks

Implementation is complete through Task 7. Merged code and automated tests do
not establish whether the connected development workflow has been accepted.
Record the outcome of these checks when performed; do not assume they passed.
Start with [the import guide](sports-data.md).

- [ ] Confirm the existing Studio, development dataset, Season and club Team setup.
- [ ] Preview/apply a competition batch and inspect Aalborg details and opponent results.
- [ ] Resolve confirmed player identities, an assist and a substitute appearance in Studio.
- [ ] Repeat the import; verify corrections survive and records/events do not duplicate.
- [ ] Release a correction and verify the next import can supply DBU's value.
- [ ] Trace sample player counts to matches and explain differences from DBU's table.
- [ ] Build the public pages from development data; check mobile and keyboard use.
- [ ] Run tests, workspace type checking, lint and website/Studio builds; record failures.

The sports phase can close when the connected workflow is verified and any
blocking issues are fixed. Record accepted limitations and the check results here.
Scheduled imports, production data access, hosting and rebuild automation remain
launch work. The importer is currently manual and development-only.
