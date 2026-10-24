# Manual development schedule synchronization

Task 3 adds `packages/importer`, a Node-only command that keeps public DBU
retrieval, pure parsing/normalization, reconciliation and Sanity persistence
separate. The default is a dry-run. Development and tests use saved HTML and
simulated persistence; no real Sanity import has been executed by this PR.
The command imports Competition, scoped Team entries and Match fixture facts.
Lineups, players and events remain Task 4.

## Start with the offline preview

From the repository root (Node 24 recommended):

```sh
pnpm sync:schedule --pool 508399 --season season-example \
  --time-zone Europe/Copenhagen \
  --html packages/dbu/fixtures/competition-508399.html \
  --existing packages/importer/fixtures/empty-development.json
```

This uses a fictional existing Season and the saved schedule. It plans 101
creates: one Competition, ten Team entries and 90 Matches. It does not prompt
for credentials, contact Sanity, write snapshot files or mutate anything.
`--existing` is exclusively an offline simulation and cannot be combined with
`--apply` or a Sanity target. Relative input paths use the directory from which
pnpm was invoked. `pnpm sync:schedule --help` lists the available options.

## Prepare a real development preview

1. Create a Season in your development Studio and obtain its published document
   `_id` (the document inspector shows it). Supply that ID, not its name. The
   Season needs valid dates. This importer does not invent/create seasons or
   reassign an existing Competition to a different Season.
2. Choose the intended Sanity **development project** and dataset. The command
   accepts only the dataset named `development`; there is no production flag.
3. Supply an explicit IANA source timezone such as `Europe/Copenhagen` **after
   confirming that this is how the competition's displayed times should be
   interpreted**. The source research has not established a DBU timezone
   contract. The flag is an operator assertion, not a discovery from HTML.
4. Create a dedicated project robot token with content read/write permission.
   Keep it in your password manager. A standard Editor token can access other
   datasets in that project; the command's dataset restriction is an application
   guard, not token-level isolation. Prefer a separate development project if
   production content is present and dataset-specific roles are unavailable.
   See [Sanity token documentation](https://www.sanity.io/docs/content-lake/http-auth)
   and [role scope](https://www.sanity.io/docs/content-lake/roles-concepts).

Run this yourself in an interactive terminal, replacing the example identifiers:

```sh
pnpm sync:schedule --pool 508399 --season YOUR_PUBLISHED_SEASON_ID \
  --time-zone Europe/Copenhagen --project YOUR_PROJECT_ID --dataset development
```

Without `--html`, the command downloads only the full competition schedule
from public DBU HTML. You can supply a reviewed local schedule HTML file instead.
It requests the Sanity token through a hidden terminal prompt, reads a current
raw dataset snapshot and prints a proposed plan. **This command does not write.**
The raw snapshot includes drafts/releases so conflicting publication workflows
can be detected; the importer refuses those conflicts instead of resolving them.

## Apply a reviewed development plan

Run the same connected command with `--apply`. It obtains a fresh snapshot,
prints the freshly computed plan and requires you to type
`apply YOUR_PROJECT_ID/development` before committing it. Inspect the new plan;
it can differ from an earlier preview if either source or dataset changed.

The token is accepted only through the hidden TTY prompt. There is no token
argument, environment variable or credential file loader. Piped input is
rejected. Do not paste tokens into chat, shell commands, Studio variables,
screenshots, source, PRs or logs. `SANITY_STUDIO_*` and `NEXT_PUBLIC_*` are browser
configuration prefixes and must never contain tokens. Git ignore would not make
a credential file inaccessible to local tools. Revoke a token in Sanity if it
is exposed. See [Studio variable exposure](https://www.sanity.io/docs/studio/environment-variables).

The CLI keeps the supplied token in process memory. It does not save or print
it, and it sanitizes library errors rather than printing request objects,
headers, causes or stacks. Other software able to inspect that process can
still read its memory; this is not a secret vault. Quit the process after use.
The AI has not read a real token or run a connected preview/import for this PR.

## Preservation and identity rules

New records receive deterministic internal IDs based on source identifiers;
external identities are stored separately. Team-entry identity includes its
pool scope. Existing records with the same verified external identity retain
their internal IDs. Similar names are never a reason to merge. Duplicate
identities, reserved-ID collisions and draft/release versions abort planning.

Only schedule-owned fields are patched. Source absence does not unset known
values, remove fixtures, reset known status, or lower a known kickoff's precision.
A lower-precision changed kickoff is retained for review. Competition points
adjustments, Team enrichment, match lineups/events, detail-sync timestamps and
unrelated metadata survive. Existing invalid records can block a plan and must
be corrected explicitly; validation is not bypassed to force an import.

Hidden `import.scheduleBaseline` entries hold per-field fingerprints of the
local values accepted by the last successful schedule sync. A local change
since that baseline, including a deliberate unset, becomes an explicit override.
Legacy values without a baseline are preserved conservatively; fully manual
records with a verified external identity retain all their schedule fields.
Importer-owned fields that still match the baseline may receive DBU corrections.
No whole-document edited flag or independent statistics totals are introduced.

Baselines accept the retained local value even while an override protects it.
After that sync, clearing an override permits the next successful source sync
to supply that field again, provided no newer local edit occurred. Nested
paths such as `score.home` protect the full score object. Task 5 will supply
editor-facing override/review controls; metadata remains hidden/read-only in
normal forms. Import conflicts set review metadata and appear in the plan;
existing review markers are never automatically cleared.

All creates and revision-checked patches are submitted as one atomic Sanity
transaction. A concurrent edit rejects the transaction rather than overwriting
it. Deterministic creates reject races instead of silently adopting or replacing
an unexpected document. The importer never deletes, replaces entire documents,
or automatically retries a write. If confirmation is lost, a transaction might
already have committed: inspect a new dry-run before retrying. These controls
assume other trusted writers also respect external identities; they are not
Sanity-wide uniqueness constraints or an authorization mechanism.

Repeated source imports do not duplicate records or change sporting fields.
A later run intentionally refreshes `lastScheduleSyncAt`; an identical plan
with an identical timestamp has no operations. The initial tool loads at most
10,000 sports/selected documents, uses 500-document read pages, and refuses
transactions above 500 operations or 4 MB. Exceeding a limit aborts; the tool
does not silently truncate data or split a plan into partially applied batches.

## Source limitations and checks

Numeric schedule scores are preserved, but do not establish finality. Explicit
supported states (`Færdigspillet`, `Kamp udsat` / `UDS`) are mapped; otherwise
status remains unknown. No clock-based guesses decide whether a match completed.
Malformed values and unknown source-status/result diagnostics stop the CLI
before a token is requested or a write is possible. This conservative behavior
can require later detail synchronization or admin enrichment before standings
are complete. See [research](dbu-schedule-sync-research.md).

Timezone conversion uses Intl's IANA data. Date-only values stay date-only;
known times convert to UTC only after the explicit zone assertion. Both
nonexistent spring-forward times and ambiguous fall-back times stop planning.
DBU requests send neither cookies nor Sanity credentials, allow only HTTPS DBU
redirects, and bound timeout, HTML response size and UTF-8 decoding.

```sh
pnpm test
pnpm typecheck
pnpm lint
SANITY_STUDIO_PROJECT_ID=localtest SANITY_STUDIO_DATASET=development pnpm studio:schema
SANITY_STUDIO_PROJECT_ID=localtest SANITY_STUDIO_DATASET=development pnpm studio:build
```

Tests use mock transport/persistence and fixtures for repeat imports, source
changes, missing data, manual enrichment/corrections, identity ambiguity,
concurrent writes, DST gaps/folds, transport boundaries, credential redaction,
and the offline CLI. A synthetic value was also entered through a pseudo-terminal
to verify that the prompt does not echo it. Authenticated development reads,
real API transaction behavior and token permissions still need a manual trial
once the PR is reviewed and merged; no production rollout is included.
