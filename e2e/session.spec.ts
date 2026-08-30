import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const cookieName = "e2e-session";
const chunkedCookieName = "e2e-chunked";

async function cookiesNamed(context: BrowserContext, name: string) {
  const all = await context.cookies();
  return all.filter((cookie) => cookie.name === name || cookie.name.startsWith(`${name}.`));
}

const sessionCookies = (context: BrowserContext) => cookiesNamed(context, cookieName);
const chunkCookies = (context: BrowserContext) => cookiesNamed(context, chunkedCookieName);

/** The cookie jar can lag the rendered response slightly, so poll it. */
function expectCookieCount(context: BrowserContext, name: string) {
  return expect.poll(async () => (await cookiesNamed(context, name)).length);
}

/** Rendered text of a testid, asserted present so callers get a plain string. */
async function textOf(page: Page, testId: string): Promise<string> {
  const value = await page.getByTestId(testId).textContent();
  expect(value).not.toBeNull();
  return value ?? "";
}

test("login sets a session cookie with safe attributes", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByTestId("username")).toHaveText("anonymous");

  await page.getByTestId("login").click();
  await expect(page.getByTestId("username")).toHaveText("alison");

  const cookies = await sessionCookies(context);
  expect(cookies).toHaveLength(1);
  expect(cookies[0]?.httpOnly).toBe(true);
  expect(cookies[0]?.sameSite).toBe("Lax");
  expect(cookies[0]?.path).toBe("/");
});

test("session survives a navigation and a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login").click();
  await expect(page.getByTestId("username")).toHaveText("alison");

  await page.getByTestId("to-other").click();
  await expect(page.getByTestId("username")).toHaveText("alison");

  await page.reload();
  await expect(page.getByTestId("username")).toHaveText("alison");

  await page.goto("/");
  await expect(page.getByTestId("username")).toHaveText("alison");
});

// #910, #870: destroy() in a Server Action POST has to remove the cookie from
// the browser, not just clear the object server-side.
test("logout removes the cookie from the browser", async ({ page, context }) => {
  await page.goto("/");
  await page.getByTestId("login").click();
  await expect(page.getByTestId("username")).toHaveText("alison");
  await expectCookieCount(context, cookieName).toBe(1);

  await page.getByTestId("logout").click();
  await expect(page.getByTestId("username")).toHaveText("anonymous");

  await expectCookieCount(context, cookieName).toBe(0);

  // And it stays gone across a reload, rather than reappearing from a stale seal.
  await page.reload();
  await expect(page.getByTestId("username")).toHaveText("anonymous");
  await expectCookieCount(context, cookieName).toBe(0);
});

// A logout handler that calls destroy() and then save() still signs the user
// out: the save is ignored instead of writing the cookie back.
test("logout still works when the handler saves after destroy", async ({ page, context }) => {
  await page.goto("/");
  await page.getByTestId("login").click();
  await expect(page.getByTestId("username")).toHaveText("alison");
  await expectCookieCount(context, cookieName).toBe(1);

  await page.getByTestId("logout-then-save").click();
  await expect(page.getByTestId("username")).toHaveText("anonymous");
  await expectCookieCount(context, cookieName).toBe(0);

  await page.reload();
  await expect(page.getByTestId("username")).toHaveText("anonymous");
  await expectCookieCount(context, cookieName).toBe(0);
});

// #684: setting an unrelated cookie after save() used to drop the session cookie.
test("a cookie set after save does not lose the session", async ({ page, context }) => {
  await page.goto("/");
  await page.getByTestId("login-then-set").click();

  await expect(page.getByTestId("username")).toHaveText("ordering");
  await expectCookieCount(context, cookieName).toBe(1);

  const unrelated = (await context.cookies()).find((cookie) => cookie.name === "unrelated");
  expect(unrelated?.value).toBe("value");

  await page.reload();
  await expect(page.getByTestId("username")).toHaveText("ordering");
});

// #887, #709, #938: a session rotated in proxy.ts must reach the browser AND be
// visible to the page rendering in that same request.
test("proxy.ts can rotate the session and the same render sees it", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login").click();
  // Wait for the action to finish, otherwise the reload below races it and the
  // request goes out without a session cookie.
  await expect(page.getByTestId("username")).toHaveText("alison");

  // proxy.ts runs before the action that creates the session, so it has nothing
  // to rotate on the login request itself. The next request is the interesting
  // one: proxy writes lastSeen and the page must read that new value in the
  // same request.
  await page.reload();
  const first = await page.getByTestId("last-seen").textContent();
  expect(first).not.toBe("never");

  await page.waitForTimeout(5);
  await page.reload();
  const second = await page.getByTestId("last-seen").textContent();
  expect(second).not.toBe("never");
  expect(Number(second)).toBeGreaterThan(Number(first));

  // And the rotation survives a navigation, so it really was persisted.
  await page.getByTestId("to-other").click();
  const third = await page.getByTestId("last-seen").textContent();
  expect(Number(third)).toBeGreaterThanOrEqual(Number(second));
});

test("a session over 4KB round-trips across several cookies", async ({ page, context }) => {
  await page.goto("/");
  await page.getByTestId("login-big").click();
  await expect(page.getByTestId("blob-length")).toHaveText("6000");

  const cookies = await chunkCookies(context);
  expect(cookies.length).toBeGreaterThan(1);
  for (const cookie of cookies) {
    expect(`${cookie.name}=${cookie.value}`.length).toBeLessThanOrEqual(4096);
  }

  await page.reload();
  await expect(page.getByTestId("blob-length")).toHaveText("6000");
});

// The lockout this feature ships with if nobody cleans up: stale chunks get
// concatenated onto the new chunk 0, the HMAC fails, and the user is signed out
// on every request while save() keeps reporting success.
test("shrinking a chunked session cleans up its old chunks", async ({ page, context }) => {
  await page.goto("/");
  await page.getByTestId("login-big").click();
  await expect(page.getByTestId("blob-length")).toHaveText("6000");
  expect((await chunkCookies(context)).length).toBeGreaterThan(1);

  await page.getByTestId("shrink-big").click();
  await expect(page.getByTestId("blob-length")).toHaveText("0");

  await page.reload();
  await expect(page.getByTestId("blob-length")).toHaveText("0");
  // The session is still readable, which is the whole point.
  await expect(page.getByTestId("chunked-username")).toHaveText("chunky");
});

/**
 * #870: "cookie not being saved with Next.js 15 and Safari".
 *
 * The library default is `secure: true` and this fixture is served over plain
 * http. The engines disagree about that, and the disagreement is the point:
 * WebKit refuses the cookie, Chromium and Firefox keep it because they treat
 * localhost as a trustworthy origin even on http.
 *
 * So the report was right to name Safari. Anyone developing on Chrome sees
 * their session work locally and then breaks for Safari users, which is why
 * this runs on all three engines.
 *
 * The fix either way is `cookieOptions: { secure: false }` in local
 * development, or serving over https (`next dev --experimental-https`).
 */
test("a Secure cookie over plain http is kept or dropped depending on the engine", async ({
  page,
  context,
  browserName,
}) => {
  await page.goto("/");

  // Wait for the action to answer before looking at the jar. Sampling early
  // reads zero cookies for the boring reason that none have arrived yet, which
  // is a pass for the wrong reason.
  const saved = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.status() < 400,
  );
  await page.getByTestId("login-secure").click();
  await saved;

  const keepsSecureCookieOnLocalhost = browserName !== "webkit";

  await expectCookieCount(context, "e2e-secure").toBe(keepsSecureCookieOnLocalhost ? 1 : 0);

  // WebKit never got the cookie, so it cannot send it back and the session
  // stays anonymous on the next request.
  if (!keepsSecureCookieOnLocalhost) {
    await page.reload();
    await expect(page.getByTestId("secure-username")).toHaveText("anonymous");
  }

  // The non-secure session works on the same page in every engine, which rules
  // out the fixture or the action being broken.
  await page.getByTestId("login").click();
  await expect(page.getByTestId("username")).toHaveText("alison");
  await expectCookieCount(context, cookieName).toBe(1);
});

/**
 * Cache Components, the Next 16 default shape. `/cache` is one page with a
 * `use cache` component and a session read in a <Suspense> boundary.
 *
 * The cached panel must never move, and the session panel must be per visitor.
 * A session leaking into the cached half would be the worst bug this library
 * could have, so it gets an assertion rather than a comment.
 */
test("a cached component stays frozen while the session stays per request", async ({ page }) => {
  await page.goto("/cache");

  const cachedAt = await textOf(page, "cached-at");

  await page.getByTestId("cache-login").click();
  await expect(page.getByTestId("username")).toHaveText("alison");

  // The session changed, the cache entry did not.
  await expect(page.getByTestId("cached-at")).toHaveText(cachedAt);

  await page.reload();
  await expect(page.getByTestId("username")).toHaveText("alison");
  await expect(page.getByTestId("cached-at")).toHaveText(cachedAt);
});

test("a second visitor sees the same cached half and no session", async ({ page, browser }) => {
  await page.goto("/cache");
  await page.getByTestId("cache-login").click();
  await expect(page.getByTestId("username")).toHaveText("alison");
  const cachedAt = await textOf(page, "cached-at");

  // A fresh context is a different browser with an empty cookie jar.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/cache");

  await expect(otherPage.getByTestId("cached-at")).toHaveText(cachedAt);
  await expect(otherPage.getByTestId("username")).toHaveText("anonymous");

  await other.close();
});

// #887, #709, #938 again, on a partially prerendered page: proxy.ts writes the
// session and the dynamic hole rendering the same request has to read it.
test("proxy rotation reaches a dynamic hole in a prerendered page", async ({ page }) => {
  await page.goto("/cache");
  await page.getByTestId("cache-login").click();
  await expect(page.getByTestId("username")).toHaveText("alison");

  await page.reload();
  const first = await textOf(page, "last-seen");
  expect(first).not.toBe("never");

  await page.waitForTimeout(5);
  await page.reload();
  const second = await textOf(page, "last-seen");
  expect(Number(second)).toBeGreaterThan(Number(first));
});

// A rejected login has to come back as state, not an exception, and must not
// write a cookie.
test("useActionState surfaces a validation error without touching the session", async ({
  page,
  context,
}) => {
  await page.goto("/cache");

  await page.getByTestId("cache-username-input").fill("a");
  await page.getByTestId("cache-login").click();

  await expect(page.getByTestId("cache-login-error")).toHaveText("too short");
  await expect(page.getByTestId("username")).toHaveText("anonymous");
  await expectCookieCount(context, cookieName).toBe(0);

  // And the same form still works once the input is valid.
  await page.getByTestId("cache-username-input").fill("alison");
  await page.getByTestId("cache-login").click();
  await expect(page.getByTestId("username")).toHaveText("alison");
  await expect(page.getByTestId("cache-login-error")).toHaveText("");
  await expectCookieCount(context, cookieName).toBe(1);
});
