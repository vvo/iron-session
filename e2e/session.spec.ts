import { expect, test, type BrowserContext } from "@playwright/test";

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
 * http. Every engine we test refuses to store that cookie, including Chromium,
 * so the "Safari" framing in the issue was a red herring: the header we send is
 * correct and complete, and the browser is doing what the spec says.
 *
 * The fix is `cookieOptions: { secure: false }` in local development, or serving
 * over https (`next dev --experimental-https`).
 */
test("a Secure cookie is dropped over plain http, in every browser", async ({ page, context }) => {
  await page.goto("/");
  await page.getByTestId("login-secure").click();

  // The response carries a well-formed `Secure` cookie, verified separately with
  // curl, and no browser keeps it on an insecure origin.
  await expectCookieCount(context, "e2e-secure").toBe(0);
  await expect(page.getByTestId("secure-username")).toHaveText("anonymous");

  // The non-secure session still works on the same page, which rules out the
  // fixture or the action being broken.
  await page.getByTestId("login").click();
  await expect(page.getByTestId("username")).toHaveText("alison");
  await expectCookieCount(context, cookieName).toBe(1);
});
