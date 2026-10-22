import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals.map((config) => ({
    ...config,
    files: ["apps/web/**/*.{js,mjs,cjs,ts,tsx}"],
  })),
  ...nextTs,
  { settings: { next: { rootDir: "apps/web/" } } },
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "**/.sanity/**",
    "**/next-env.d.ts",
  ]),
]);
