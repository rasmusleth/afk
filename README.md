# Aalborg Futsal Klub

A pnpm workspace containing two independent applications and shared sports logic:

```text
apps/
  web/           Next.js public website
  studio/        Sanity Studio, configuration and schemas
packages/
  sports/        Framework-independent sports models and validation
```

Use Node 22.12+ (Node 24 recommended) and pnpm 12.11.2. Install from the
repository root with `pnpm install`; the workspace uses one lockfile.

| Root command | Purpose |
| --- | --- |
| `pnpm dev` | Start the website at http://localhost:3000 |
| `pnpm build` | Build the website |
| `pnpm start` | Serve the built website |
| `pnpm studio` | Start Studio at http://localhost:3333 |
| `pnpm studio:build` | Build Studio into `apps/studio/dist/` |
| `pnpm studio:schema` | Extract Studio schema into `apps/studio/.sanity/schema.json` |
| `pnpm test` | Run domain and schema tests |
| `pnpm typecheck` | Check all workspace packages |
| `pnpm lint` | Lint source across the workspace |

Each application has its own `package.json` and configuration. Use
`pnpm --filter @afk/web <command>` or `pnpm --filter @afk/studio <command>`
to target one application. Shared development tools are managed at the root.

Sanity's project and dataset configuration goes in `apps/studio/.env.local`.
Next.js environment settings go in `apps/web/.env.local`. The public website
can build without any Sanity settings. See the [Studio setup guide](docs/sanity-studio.md)
for the account setup command and remaining manual steps, and
[architecture.md](docs/architecture.md) for the sports data model.
