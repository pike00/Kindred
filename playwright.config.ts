import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    headless: true,
    viewport: { width: 1280, height: 720 },
    storageState: "e2e/.auth/user.json",
  },
  projects: [{ name: "chromium", use: { channel: "chromium" } }],
  globalSetup: "e2e/global-setup.ts",
  reporter: [["list"], ["html", { outputFolder: "e2e/report", open: "never" }]],
})
