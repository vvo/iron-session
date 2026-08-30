import { defineConfig, devices } from "@playwright/test";

const port = 3210;

export default defineConfig({
  testDir: "./e2e",
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
    command: "pnpm --filter=e2e-fixture start",
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env["CI"],
    env: { PORT: String(port) },
    timeout: 120_000,
  },
});
