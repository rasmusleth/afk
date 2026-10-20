# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

- Never expose secrets through `NEXT_PUBLIC_*` environment variables.
- Never move server-side credentials into client components.

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
- Do not introduce new infrastructure, databases, frameworks, or major
  dependencies without a concrete need.
- Follow existing project conventions where they exist.
- Prefer strong TypeScript types and explicit domain models.
- Avoid duplicating state that can reliably be derived.
- Keep domain logic separate from UI concerns.

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

Prefer pure parsing/normalization functions where practical so they can be
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

## Working approach

Before significant changes:

1. Read the relevant existing code.
2. Read the relevant architecture documentation.
3. Identify assumptions or unresolved decisions.
4. Propose a plan for non-trivial changes before implementing them.

When implementing:

- Keep changes focused on the requested task.
- Avoid unrelated refactoring.
- Add or update tests for important domain/import logic.
- Run the relevant typecheck, lint, and test commands before considering the
  task complete.
- Do not hide failing checks or unrelated issues; report them clearly.

After significant implementation work, summarize:

- what changed
- important design decisions
- tests/checks performed
- remaining assumptions or follow-up work

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
