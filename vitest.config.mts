import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    projects: ['packages/sports', 'packages/dbu', 'packages/importer', 'apps/studio', 'apps/web'].map(directory => ({
      test: {
        name: `@afk/${directory.split('/')[1]}`,
        include: [`${directory}/**/*.test.ts`],
      },
    })),
  },
});
