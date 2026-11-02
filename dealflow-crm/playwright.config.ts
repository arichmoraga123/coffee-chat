import { defineConfig } from "@playwright/test";

/**
 * Browser tests. Needs a running app (default http://localhost:3100) on a local database seeded with
 * `npx tsx tests/seed-e2e.ts`. Run: npm run test:e2e
 */
export default defineConfig({
  testDir: "tests",
  testMatch: /.*\.spec\.ts/,
  timeout: 90_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100", viewport: { width: 1280, height: 860 } },
});
