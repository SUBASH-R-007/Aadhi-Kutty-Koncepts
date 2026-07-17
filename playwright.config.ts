import { defineConfig } from "@playwright/test";

/**
 * E2E tests need the dev server and a reachable PostgreSQL (docker compose up
 * -d db && npm run db:migrate). They run the full workflow with the keyless
 * mock providers.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
