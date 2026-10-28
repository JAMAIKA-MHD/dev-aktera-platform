import { defineConfig } from "@playwright/test";

// End-to-end suite (tests/e2e/): every game in every template, on the real local Supabase.
// Needs `npx supabase start` and `npx supabase functions serve --env-file .env.local`; the
// app is started here unless one already runs on :3000. PW_CHANNEL picks an installed
// browser ("msedge", "chrome") instead of Playwright's own Chromium.
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: Number(process.env.PW_WORKERS ?? 2),
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "test-results/e2e-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: process.env.PW_CHANNEL || undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
