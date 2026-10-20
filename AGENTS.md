# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

This is the Aalborg Futsal Klub website.

The project uses Next.js for the public website and Sanity for content
management and structured sports data.

Before making architectural or sports-data changes, read:

- `docs/architecture.md`

Treat that document as the current source of truth for architectural decisions.

If implementation reveals a reason to deviate from it, do not silently work
around the decision. Explain the conflict and propose an architecture update.

## Development principles

- Prefer simple, maintainable solutions over speculative abstractions.
- Make the smallest coherent change that fully solves the requested task.
- Follow existing project conventions and patterns where they exist.
- Prefer strong TypeScript types and explicit domain models.
- Avoid duplicating state that can reliably be derived.
- Keep domain logic separate from UI concerns.
- Avoid unrelated refactoring or cleanup.
- Do not introduce new infrastructure, databases, frameworks, or major
  dependencies without a concrete need.

## Working approach

Before making changes:

1. Read the relevant existing code.
2. Read relevant project documentation, especially `docs/architecture.md`
   when the task touches architecture or sports data.
3. Inspect existing patterns before introducing a new one.

For routine implementation decisions, use the existing architecture and
project conventions rather than stopping for confirmation.

Stop and ask before proceeding when:

- requirements are materially ambiguous and different interpretations would
  produce substantially different behavior
- the requested change conflicts with `docs/architecture.md`
- a destructive or difficult-to-reverse operation appears necessary
- the change requires production access, deployment, or production credentials
- a major new dependency, service, database, or architectural direction appears
  necessary

When implementing:

- Keep changes focused on the requested task.
- Avoid unrelated refactoring.
- Add or update tests for important domain and importer logic.
- Preserve existing behavior unless changing it is part of the task.
- Do not weaken types, tests, lint rules, or other safeguards merely to make a
  change pass.

## Validation

Before considering implementation complete:

- Run the relevant tests.
- Run type checking and linting when available.
- Run a production build when the change could affect build or runtime behavior.
- Fix failures caused by the change.
- Do not hide, disable, or bypass failing checks.
- Clearly report failures that appear unrelated to the change.

After significant implementation work, summarize:

- what changed
- important design decisions
- tests and checks performed
- remaining assumptions, known issues, or follow-up work

## Git and pull requests

- Never make implementation commits directly on `main`.
- Create a dedicated feature branch for each task.
- Use descriptive branch names.
- Keep commits focused and use clear commit messages.
- Do not rewrite shared history.
- Never force-push `main`.
- Never bypass repository rules, branch protections, or required checks.
- Never merge your own pull request.
- When a task is complete and validated, push the feature branch and open a
  pull request targeting `main`.
- Include a concise summary and validation/testing information in the pull
  request description.
- Leave final review and merge to the user.

## Secrets and environment

- Never commit secrets, credentials, tokens, private keys, or populated
  environment files.
- Treat `.env*` files as potentially sensitive.
- Use `.env.example` to document required environment variables without real
  secret values.
- Never expose secrets through `NEXT_PUBLIC_*` environment variables.
- Never move server-side credentials into client components or client-side
  code.
- Do not inspect, print, copy, encode, or otherwise expose credentials unless
  the user explicitly requests credential-related debugging.
- Do not modify authentication, credential storage, or security configuration
  unless explicitly requested.

## Safety and production

Normal development work should remain within the local development environment
and repository.

Unless explicitly requested:

- do not access production infrastructure or production databases
- do not access production secrets or deployment credentials
- do not deploy to production
- do not SSH into servers
- do not modify DNS, hosting, CI/CD, repository security, or external service
  configuration
- do not weaken sandboxing, authentication, branch protection, or other
  security controls

Prefer reversible and non-destructive operations.

Do not use destructive Git operations such as `git reset --hard`, force push,
or history rewriting unless explicitly requested and the consequences are
understood.

## Dependencies

- Use the project's existing package manager.
- Prefer existing dependencies and platform capabilities where practical.
- Do not add a dependency when the task can reasonably be solved with the
  existing stack.
- Before adding a significant dependency, consider maintenance burden,
  security, bundle/runtime impact, and whether an existing dependency already
  solves the problem.
- Do not perform broad or unrelated dependency upgrades as part of another
  task.

## Sports data

Matches are the canonical source of sporting data.

Player and season statistics should be derived from match participation and
match events rather than maintained as independent editable totals.

Preserve the distinction between:

- imported data
- manual enrichment
- manual corrections/overrides
- derived data
- unknown values and known zero/false values

Never implement synchronization that can silently destroy manual admin data.

See `docs/architecture.md` for the complete sports-data model and import rules.

## DBU importer

Do not guess DBU's HTML structure. Inspect the actual markup and use saved HTML
fixtures in parser tests.

Keep these concerns separate:

1. fetching
2. parsing
3. normalization
4. reconciliation
5. Sanity persistence

Prefer pure parsing and normalization functions where practical so they can be
tested independently of DBU and Sanity.

DBU-specific concepts should be normalized at the importer boundary rather
than leaking unnecessarily into the rest of the application.

Synchronization should be conservative when scraped data conflicts with
existing manually edited data.

## Sanity

Sanity is the initial CMS and sports-data store.

Do not introduce PostgreSQL unless the architecture is explicitly reconsidered.

Schemas should prioritize:

- data integrity
- good editor UX
- clear references and relationships
- preservation of import metadata
- support for derived statistics

Technical import metadata should generally be hidden or read-only for normal
editors where appropriate.

## Repository knowledge

As stable project-specific conventions emerge, update this file when useful.

Examples include:

- package manager and common commands
- repository structure
- testing conventions
- naming conventions
- environment setup
- deployment constraints

Do not turn this file into comprehensive project documentation. Detailed
architecture belongs in `docs/architecture.md`.
