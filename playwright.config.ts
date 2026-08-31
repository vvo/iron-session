import { defineConfig, devices } from "@playwright/test";

const port = 3210;

export default defineConfig({
  testDir: "./e2e",
  // The examples suite runs against a deployed URL, not the fixture below.
  // See `playwright.deployed.config.ts`.
  testIgnore: "examples.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? [["html"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${port}` },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // WebKit is not optional here. #870 reports cookies not being saved in
    // Safari and the thread has two contradicting community fixes, so we need a
    // real assertion rather than another theory.
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    // Build before starting. `next start` serves whatever is in `.next`, so
    // without this a stale build silently tests the previous commit's fixture:
    // adding a route made 12 tests fail locally while CI, which builds in its
    // own step, was green.
    command: "pnpm --filter=e2e-fixture build && pnpm --filter=e2e-fixture start",
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env["CI"],
    env: { PORT: String(port) },
    timeout: 120_000,
  },
});
