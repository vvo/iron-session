import { defineConfig, devices } from "@playwright/test";

/**
 * Runs `e2e/examples.spec.ts` against a deployed URL instead of a local server.
 *
 * `.github/workflows/e2e-deployed.yaml` points `BASE_URL` at the Vercel
 * deployment for the commit, so every PR gets its own preview tested before
 * merge, and production gets tested again after.
 */
const baseURL = process.env["BASE_URL"];

if (!baseURL) {
  throw new Error("BASE_URL is required, e.g. BASE_URL=https://get-iron-session.vercel.app");
}

/**
 * Preview deployments sit behind Vercel Authentication, which answers every
 * request with a redirect to vercel.com/sso-api. This is the project's
 * "Protection Bypass for Automation" secret, which lets CI through without
 * making previews public. Unset when running against a public URL.
 */
const bypassSecret = process.env["VERCEL_AUTOMATION_BYPASS_SECRET"];

export default defineConfig({
  testDir: "./e2e",
  // Only the deployed-site suite. The library assertions in session.spec.ts
  // need the fixture app and its known cookie names.
  testMatch: "examples.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  // A deployment is a network hop away and its functions cold start, so
  // everything gets more room than the localhost suite. The default 5s
  // assertion timeout is the one that matters: these examples `sleep(250)` in
  // their handlers, and the SWR examples roll their optimistic state back when
  // a slow POST has not answered yet, so a cold start reads as a failed login.
  retries: process.env["CI"] ? 2 : 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  // Enough to keep the suite quick, few enough that we are not measuring how
  // many lambdas Vercel can cold start at once.
  workers: 4,
  reporter: process.env["CI"] ? [["html"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    ...(bypassSecret && {
      extraHTTPHeaders: { "x-vercel-protection-bypass": bypassSecret },
    }),
  },
  // One browser is enough here: this suite checks the deployment works, and
  // cross-browser cookie behaviour is already covered on Chromium, Firefox and
  // WebKit by the fixture suite.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
