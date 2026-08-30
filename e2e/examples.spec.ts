import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke tests for the examples app running on a real Vercel deployment.
 *
 * These are deliberately separate from `e2e/session.spec.ts`. That suite
 * asserts library behaviour against a minimal fixture on localhost. This one
 * asserts the deployed site still works, which is a different failure mode:
 * v9 moved the example passwords into environment variables
 * (`examples/next/src/passwords.ts`), nothing set them on the Vercel project,
 * and every example answered an empty 500 for weeks. Builds stayed green the
 * whole time, because the password is read per request.
 *
 * So this covers the deployed artifact, not the library: the flows a visitor
 * runs, through the same proxy, cookies and environment they hit.
 *
 * Driven by `BASE_URL`, see `playwright.deployed.config.ts`.
 */

const username = "E2EUser";

/** Every example names its cookie `iron-examples-<example>`. */
const cookiePrefix = "iron-examples-";

/** Every example renders the logged-in state as `Logged in user: <name>`. */
function loggedInAs(page: Page, name: string) {
  return expect(page.getByText(`Logged in user: ${name}`)).toBeVisible();
}

const loginForm = (page: Page) => page.getByRole("textbox", { name: "Username" });
const loginButton = (page: Page) => page.getByRole("button", { name: "Login" });
const counter = (page: Page, value: string) =>
  page.getByRole("button", { name: value, exact: true });

// Some examples log out through a `<Link>` and some through an `<a onClick>`
// with no href, and an anchor without an href has no link role. Match the
// element, not the role.
const logout = (page: Page) => page.locator("a", { hasText: /^Logout$/ });

async function sessionCookies(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.filter((cookie) => cookie.name.startsWith(cookiePrefix));
}

/**
 * Navigate, and wait until the page's own client code is running.
 *
 * Required before touching a form. The SWR examples render their login form in
 * the server HTML (`fallbackData` means they never show a loading state) and
 * submit it through a React `onSubmit` that calls `preventDefault()`. That form
 * has no `action`, so clicking it before hydration posts to the page URL
 * instead of the session route.
 *
 * Every example reads its session from the client on mount, so that GET is the
 * signal. The listener goes on before `goto` so a fast response cannot be
 * missed.
 */
async function openExample(page: Page, path: string) {
  const sessionRead = page.waitForResponse(
    (response) => response.url().includes("/session") && response.request().method() === "GET",
  );

  await page.goto(path);
  await sessionRead;
}

async function login(page: Page, name = username) {
  await loginForm(page).fill(name);
  await loginButton(page).click();
  await loggedInAs(page, name);

  // The rendered state is not proof the session was saved. The SWR examples
  // pass `optimisticData`, so they show the logged-in UI before the POST that
  // sets the cookie has answered. Anything navigating next would race it.
  await expect.poll(async () => (await sessionCookies(page)).length).toBeGreaterThan(0);
}

async function expectProtectedPage(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Protected page" })).toBeVisible();
  await expect(page.getByText(`Hello ${username}!`)).toBeVisible();
}

test("home page lists the examples", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Main Examples:" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "App router + client components, route handlers, and SWR" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Pages Router + API routes, getServerSideProps, and SWR" }),
  ).toBeVisible();
});

// The two examples the README points at first, so they get the full flow:
// login, persistence across a reload, logout. Only the app router one renders a
// counter button, which is the example's way of writing to an existing session.
for (const { name, path, hasCounter } of [
  {
    name: "app router + route handlers + SWR",
    path: "/app-router-client-component-route-handler-swr",
    hasCounter: true,
  },
  {
    name: "pages router + API routes + SWR",
    path: "/pages-router-api-route-swr",
    hasCounter: false,
  },
]) {
  test(`${name}: login, reload, logout`, async ({ page }) => {
    await openExample(page, path);
    await login(page);

    if (hasCounter) {
      // A write to an existing session. Same optimistic-render caveat as the
      // login above: wait for the PATCH to answer, otherwise the reload below
      // can beat the save and read the counter back as 0.
      const written = page.waitForResponse(
        (response) =>
          response.url().includes("/session") && response.request().method() === "PATCH",
      );

      await counter(page, "0").click();
      await written;
      await expect(counter(page, "1")).toBeVisible();
    }

    // A sealed cookie that survives a reload is the point of the library.
    await page.reload();
    await loggedInAs(page, username);

    if (hasCounter) {
      await expect(counter(page, "1")).toBeVisible();
    }

    await logout(page).click();
    await expect(loginForm(page)).toBeVisible();

    // #870: logout has to clear the cookie in the browser, not only server-side.
    await expect.poll(async () => (await sessionCookies(page)).length).toBe(0);
  });
}

// Covers `src/proxy.ts`, which reads the session through `nextProxyCookies`.
// That is a separate code path from the route handlers and broke the same way.
for (const { name, base } of [
  { name: "app router", base: "/app-router-client-component-route-handler-swr" },
  { name: "pages router", base: "/pages-router-api-route-swr" },
]) {
  test(`${name}: proxy redirects anonymous users away from the protected page`, async ({
    page,
  }) => {
    await page.goto(`${base}/protected-middleware`);

    await expect(page).toHaveURL(new RegExp(`${base}/?$`));
    await expect(loginForm(page)).toBeVisible();
  });

  test(`${name}: protected pages render once logged in`, async ({ page }) => {
    await openExample(page, base);
    await login(page);

    // One per way of reading the session: the proxy, a server component, and a
    // client fetch. They share a cookie but not a code path.
    await expectProtectedPage(page, `${base}/protected-middleware`);
    await expectProtectedPage(page, `${base}/protected-server`);
    await expectProtectedPage(page, `${base}/protected-client`);
  });
}

// These two log in through a redirect response rather than a JSON fetch, so they
// cover the status code as much as the session. A POST answered with 307 keeps
// the method, and the browser re-posts to a page and gets a blank 405.
for (const { name, path } of [
  {
    name: "app router + redirects",
    path: "/app-router-client-component-redirect-route-handler-fetch",
  },
  { name: "pages router + redirects", path: "/pages-router-redirect-api-route-fetch" },
]) {
  test(`${name}: login and logout`, async ({ page }) => {
    await openExample(page, path);
    await login(page);

    await page.reload();
    await loggedInAs(page, username);

    await logout(page).click();
    await expect(loginForm(page)).toBeVisible();
  });
}

// Magic links use a second password (`MAGIC_LINK_PASSWORD`) and seal their token
// with `sealData` instead of writing a session cookie, so a missing or shared
// secret here fails independently of everything above.
test("magic links: a generated link logs you in", async ({ page, context }) => {
  await openExample(page, "/app-router-magic-links");

  await loginForm(page).fill(username);
  await page.getByRole("button", { name: "Get magic login link" }).click();

  const link = page.getByRole("link", { name: /magic-login\?seal=/ });
  await expect(link).toBeVisible();

  const href = await link.getAttribute("href");

  if (href === null) {
    throw new Error("the magic link was rendered without an href");
  }

  // Drop every cookie before following it: the point of a magic link is logging
  // in someone who has no session yet. Clearing this context rather than making
  // a new one keeps the config's options, which on a preview deployment include
  // the header that gets past Vercel Authentication.
  await context.clearCookies();

  await page.goto(href);

  await expect(page).toHaveURL(/\/app-router-magic-links\/?$/);
  await loggedInAs(page, username);
});

test("magic links: a tampered seal does not log you in", async ({ page }) => {
  await page.goto("/app-router-magic-links/magic-login?seal=not-a-real-seal");

  await expect(page).toHaveURL(/\/app-router-magic-links\/?$/);
  await expect(loginForm(page)).toBeVisible();
});
