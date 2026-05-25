import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Contact CRUD E2E tests.
 * Runs against the live docker compose stack.
 */
export default defineConfig({
  testDir: "./",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],

  use: {
    baseURL: process.env.VITE_API_URL || "http://localhost:5173",
    apiURL: process.env.INTERNAL_API_URL || "http://localhost:8000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Run against the dev stack
  webServer: process.env.CI
    ? undefined
    : {
        command: "bun run dev --host 0.0.0.0 --port 5173",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
