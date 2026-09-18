import { defineConfig, devices } from "@playwright/test";

/**
 * Frontend e2e smoke suite (Sept 18 nav plan, Phase D) — none existed
 * before this; Vitest (`vitest.config.mts`) stays the unit/integration
 * layer, concentrated on the simulation engine. This is the first and
 * only e2e layer, deliberately kept to a handful of golden-path specs
 * rather than broad coverage.
 *
 * `e2e/landing-and-workshop.spec.ts` needs only this frontend's own dev
 * server (started automatically below) — the simulation engine runs
 * entirely client-side. Every other spec needs the real backend stack
 * too (`docker compose up` from `engineering-studio-backend/`) and reads
 * its base URL from `NEXT_PUBLIC_API_BASE_URL`/`.env.local`, same as the
 * app itself — they each check for it at the top of the file and skip
 * (not fail) if the stack isn't reachable, so `npx playwright test` still
 * runs cleanly frontend-only.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
