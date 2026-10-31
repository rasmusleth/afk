# Aalborg Futsal Klub

The public website, Sanity Studio and DBU sports-data importer share one pnpm workspace.

**Importing sports data? Start with [Sports data: DBU → Sanity](docs/sports-data.md).**
It explains the commands, one-time setup and normal preview → import → review workflow.

## Local development

Use Node 24 and pnpm 12.11.2. Run commands from the repository root.

```sh
pnpm install
pnpm dev       # Website: http://localhost:3000
pnpm studio    # Sanity Studio: http://localhost:3333 (separate terminal)
```

| Command | Purpose |
| --- | --- |
| `pnpm test` | Run all workspace tests |
| `pnpm typecheck` | Type-check all workspace packages |
| `pnpm lint` | Lint the workspace |
| `pnpm build` | Export the website to `apps/web/out/` |
| `pnpm studio:build` | Build Studio into `apps/studio/dist/` |
| `pnpm studio:schema` | Extract the Studio schema |

The website is a static export; serve `apps/web/out/` with a static server rather
than `pnpm start`. Without sports configuration it displays an empty state.

## Where things live

- `apps/web`: Next.js website. [Data preview and static serving](docs/public-sports-views.md).
- `apps/studio`: Sanity Studio and schemas. [Setup](docs/sanity-studio.md) · [Editor guide](docs/sports-editor-review.md).
- `packages/sports`: shared models, validation and derived statistics.
- `packages/dbu`: pure HTML parsing and saved fixtures.
- `packages/importer`: fetching, reconciliation, Sanity writes and reporting.

[Architecture](docs/architecture.md) records domain decisions.
[Sports progress](docs/sports-data-work-plan.md) records the accepted sports scope and deferred work.
