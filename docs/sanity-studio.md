# Sanity Studio setup

Reuse your existing project and `development` dataset if already configured.
Studio edits content; the [import commands](sports-data.md) run separately.

## Connect locally

1. Copy `apps/studio/.env.example` to `apps/studio/.env.local` and set:

   ```dotenv
   SANITY_STUDIO_PROJECT_ID=your_project_id
   SANITY_STUDIO_DATASET=development
   ```

2. From the repository root, run `pnpm studio` and open http://localhost:3333.
3. Sign in with your Sanity account. If the origin is rejected, a project
   administrator needs to allow the local Studio origin in Sanity.

These two settings are public identifiers. Never put tokens in
`SANITY_STUDIO_*` variables: they enter the browser bundle. The importer asks
for its token separately in the terminal. Website configuration belongs in
`apps/web/.env.local`; root environment files are not loaded by either app.

If no Sanity project exists, the interactive account setup command is:

```sh
pnpm create sanity@latest --bare --dataset development
```

This creates/selects cloud resources. `--bare` uses the existing Studio rather
than scaffolding another one. Copy the resulting project ID into the local
configuration above. [Sanity setup reference](https://www.sanity.io/docs/cli-reference/init).

## Editing

Sports edits save directly, without a publish step. Validation messages do not
prevent incomplete live records from being saved. Use a small trusted editor group.
See [the editor guide](sports-editor-review.md) for resolving imported data.

## Build and schema checks

`pnpm studio:build` writes `apps/studio/dist/`; `pnpm studio:schema` extracts
`apps/studio/.sanity/schema.json`. Studio hosting is a separate launch decision.

For offline bundling/schema checks without a real project:

```sh
SANITY_STUDIO_PROJECT_ID=localtest SANITY_STUDIO_DATASET=development pnpm studio:schema
SANITY_STUDIO_PROJECT_ID=localtest SANITY_STUDIO_DATASET=development pnpm studio:build
```

These commands verify the schema/bundle, not real login or dataset permissions.
