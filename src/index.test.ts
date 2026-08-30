import { deepEqual, doesNotMatch, equal, match, rejects, throws } from "node:assert";
import { mock, test } from "node:test";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionOptions } from "./index.js";
import {
  getIronSession,
  nextProxyCookies,
  nodeCookies,
  sealData,
  unsealData,
  webCookies,
} from "./index.js";

const password = "Gbm49ATjnqnkCCCdhV4uDBhbfnPqsCW0";
const cookieName = "test";

interface Data {
  user?: { id: number; meta?: string };
}

const getSession = async (
  req: IncomingMessage | Request,
  res: Response | ServerResponse,
  options: SessionOptions,
) => getIronSession<Data>(req, res, options);

await test("should throw if the request parameter is missing", async () => {
  await rejects(
    // @ts-expect-error we're verifying JavaScript runtime checks here (DX)
    getSession(),
    "Error: iron-session: Bad usage: use getIronSession(req, res, options) or getIronSession(cookies, options).",
  );
});

await test("should throw if the response parameter is missing", async () => {
  await rejects(
    // @ts-expect-error we're verifying JavaScript runtime checks here (DX)
    getSession({}),
    "Error: iron-session: Bad usage: use getIronSession(req, res, options) or getIronSession(cookies, options).",
  );
});

await test("should throw if the cookie name is missing in options", async () => {
  await rejects(
    getSession({} as Request, {} as Response, {} as SessionOptions),
    /Missing cookie name/,
  );
});

await test("should throw if password is missing in options", async () => {
  await rejects(
    getSession({} as Request, {} as Response, { cookieName } as SessionOptions),
    /Missing password/,
  );
});

await test("should throw if password is less than 32 characters", async () => {
  await rejects(
    getSession({} as Request, {} as Response, {
      cookieName,
      password: "123456789012345678901234567890",
    }),
    /Password must be at least 32 characters long/,
  );
});

await test("should return blank session if no cookie is set", async () => {
  const session = await getSession({ headers: {} } as Request, {} as Response, {
    cookieName,
    password,
  });
  deepEqual(session, {});
});

await test("should set a cookie in the response object on save", async () => {
  const res = {
    getHeader: mock.fn(),
    setHeader: mock.fn(),
  };

  const session = await getSession({ headers: {} } as Request, res as unknown as ServerResponse, {
    cookieName,
    password,
  });
  session.user = { id: 1 };
  await session.save();

  const [name, value] = res.setHeader.mock.calls[0]?.arguments ?? [];
  equal(name, "set-cookie");
  match(value[0], /^test=.{265}; Max-Age=1209540; Path=\/; HttpOnly; Secure; SameSite=Lax$/);

  mock.reset();
});

await test("should allow deleting then saving session data", async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() };

  let session = await getSession({ headers: {} } as Request, res as unknown as ServerResponse, {
    cookieName,
    password,
  });
  session.user = { id: 1 };
  await session.save();

  let cookie = res.setHeader.mock.calls[0]?.arguments[1][0].split(";")[0];
  session = await getSession(
    { headers: { cookie } } as IncomingMessage,
    res as unknown as ServerResponse,
    {
      cookieName,
      password,
    },
  );
  deepEqual(session, { user: { id: 1 } });

  delete session.user;
  await session.save();

  cookie = res.setHeader.mock.calls[1]?.arguments[1][0].split(";")[0];
  session = await getSession(
    { headers: { cookie } } as IncomingMessage,
    res as unknown as ServerResponse,
    {
      cookieName,
      password,
    },
  );
  deepEqual(session, {});

  mock.reset();
});

await test("should set max-age to a large number if ttl is 0", async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() };

  const session = await getSession(
    { headers: {} } as IncomingMessage,
    res as unknown as ServerResponse,
    {
      cookieName,
      password,
      ttl: 0,
    },
  );
  session.user = { id: 1 };
  await session.save();

  const cookie = res.setHeader.mock.calls[0]?.arguments[1][0];
  match(cookie, /Max-Age=2147483647;/);

  mock.reset();
});

await test("should respect provided max-age in cookie options", async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() };
  const options = { cookieName, password, cookieOptions: { maxAge: 60 } };

  const session = await getSession(
    { headers: {} } as IncomingMessage,
    res as unknown as ServerResponse,
    options,
  );
  session.user = { id: 1 };
  await session.save();

  const cookie = res.setHeader.mock.calls[0]?.arguments[1][0];
  match(cookie, /Max-Age=60;/);

  mock.reset();
});

await test("should not set max-age for session cookies", async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() };
  const options = {
    cookieName,
    password,
    cookieOptions: { maxAge: undefined },
  };

  const session = await getSession(
    { headers: {} } as IncomingMessage,
    res as unknown as ServerResponse,
    options,
  );
  session.user = { id: 1 };
  await session.save();

  const cookie = res.setHeader.mock.calls[0]?.arguments[1][0];
  doesNotMatch(cookie, /Max-Age/);

  mock.reset();
});

await test("should expire the cookie on destroying the session", async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() };

  const session = await getSession(
    { headers: {} } as IncomingMessage,
    res as unknown as ServerResponse,
    {
      cookieName,
      password,
    },
  );
  session.user = { id: 1 };
  await session.save();

  let cookie = res.setHeader.mock.calls[0]?.arguments[1][0];
  match(cookie, /Max-Age=1209540;/);

  deepEqual(session, { user: { id: 1 } });
  session.destroy();
  deepEqual(session, {});

  cookie = res.setHeader.mock.calls[1]?.arguments[1][0];
  match(cookie, /Max-Age=0;/);

  mock.reset();
});

await test("should reset the session if the seal is expired", async () => {
  const real = Date.now;
  Date.now = () => 0;

  const seal = await sealData({ user: { id: 1 } }, { password, ttl: 60 });
  const req = {
    headers: { cookie: `${cookieName}=${seal}` },
  } as IncomingMessage;

  let session = await getSession(req, {} as unknown as ServerResponse, {
    cookieName,
    password,
  });
  deepEqual(session, { user: { id: 1 } });

  Date.now = () => 120_000; // = ttl + 60s skew

  session = await getSession(req, {} as unknown as ServerResponse, {
    cookieName,
    password,
  });
  deepEqual(session, {});

  Date.now = real;
});

await test("should refresh the session (ttl, max-age) on save", async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() };
  const options = { cookieName, password, ttl: 61 };

  const real = Date.now;
  Date.now = () => 0;

  let session = await getSession(
    { headers: {} } as IncomingMessage,
    res as unknown as ServerResponse,
    options,
  );
  session.user = { id: 1 };
  await session.save();

  let cookie = res.setHeader.mock.calls[0]?.arguments[1][0];
  match(cookie, /Max-Age=1;/);

  Date.now = () => 120_000; // < ttl + 60s skew

  session = await getSession(
    { headers: { cookie: cookie.split(";")[0] } } as IncomingMessage,
    res as unknown as ServerResponse,
    options,
  );
  deepEqual(session, { user: { id: 1 } });

  await session.save(); // session is now valid for another ttl + 60s

  cookie = res.setHeader.mock.calls[1]?.arguments[1][0];
  match(cookie, /Max-Age=1;/); // max-age is relative to the current time

  Date.now = () => 240_000; // < earlier time + ttl + 60s skew

  session = await getSession(
    { headers: { cookie: cookie.split(";")[0] } } as IncomingMessage,
    res as unknown as ServerResponse,
    options,
  );
  deepEqual(session, { user: { id: 1 } }); // session is still valid
  // if ttl wasn't refreshed, session would have been reset to {}

  Date.now = real;
  mock.reset();
});

await test("should reset the session if password is changed", async () => {
  const firstPassword = password;
  const secondPassword = "12345678901234567890123456789012";

  const seal = await sealData({ user: { id: 1 } }, { password: firstPassword });
  const req = { headers: { cookie: `${cookieName}=${seal}` } };

  const session = await getSession(req as IncomingMessage, {} as unknown as ServerResponse, {
    cookieName,
    password: secondPassword,
  });
  deepEqual(session, {});
});

await test("should decrypt cookie generated from older password", async () => {
  const firstPassword = password;
  const secondPassword = "12345678901234567890123456789012";

  const seal = await sealData({ user: { id: 1 } }, { password: firstPassword });
  const req = { headers: { cookie: `${cookieName}=${seal}` } };

  const passwords = { 2: secondPassword, 1: firstPassword }; // rotation
  const session = await getSession(req as IncomingMessage, {} as unknown as ServerResponse, {
    cookieName,
    password: passwords,
  });
  deepEqual(session, { user: { id: 1 } });
});

await test("should throw if the cookie length is too big", async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() };

  const session = await getSession(
    { headers: {} } as IncomingMessage,
    res as unknown as ServerResponse,
    {
      cookieName,
      password,
    },
  );
  session.user = { id: 1, meta: "0".repeat(3000) };
  await rejects(session.save(), /Cookie length is too big/);

  mock.reset();
});

await test("should throw if trying to save after headers are sent", async () => {
  const session = await getSession(
    { headers: {} } as IncomingMessage,
    { headersSent: true } as unknown as Response,
    { cookieName, password },
  );
  session.user = { id: 1 };

  await rejects(session.save(), /session.save\(\) was called after headers were sent/);
});

await test("should keep previously set cookie - single", async () => {
  const existingCookie = "existing=cookie";
  const res = {
    getHeader: mock.fn(() => existingCookie),
    setHeader: mock.fn(),
  };

  const session = await getSession({ headers: {} } as IncomingMessage, res as unknown as Response, {
    cookieName,
    password,
  });
  session.user = { id: 1 };
  await session.save();

  let cookies = res.setHeader.mock.calls[0]?.arguments[1];
  deepEqual(cookies[0], existingCookie);
  deepEqual(cookies.length, 2);

  session.destroy();

  cookies = res.setHeader.mock.calls[1]?.arguments[1];
  deepEqual(cookies[0], existingCookie);
  deepEqual(cookies[1], `${cookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`);

  mock.reset();
});

await test("should keep previously set cookies - multiple", async () => {
  const existingCookies = ["existing=cookie", "existing2=cookie2"];
  const res = {
    getHeader: mock.fn(() => existingCookies),
    setHeader: mock.fn(),
  };

  const session = await getSession({ headers: {} } as Request, res as unknown as Response, {
    cookieName,
    password,
  });
  session.user = { id: 1 };
  await session.save();

  let cookies = res.setHeader.mock.calls[0]?.arguments[1];
  deepEqual(cookies[0], existingCookies[0]);
  deepEqual(cookies[1], existingCookies[1]);
  deepEqual(cookies.length, 3);

  session.destroy();

  cookies = res.setHeader.mock.calls[1]?.arguments[1];
  deepEqual(cookies[0], existingCookies[0]);
  deepEqual(cookies[1], existingCookies[1]);
  deepEqual(cookies[2], `${cookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`);

  mock.reset();
});

await test("should no longer unwrap the pre-v8 `persistent` cookie format", async () => {
  // A seal in the next-iron-session (v6) format, generated with ttl: 0.
  // v8 detected the `~1` version marker and hoisted `data.persistent` to the
  // session root. v9 drops that: the marker sits outside the seal's HMAC, so
  // letting it select a code path meant attacker-controlled data reshaped the
  // session. These cookies now read as an unrecognised shape, which logs the
  // user out once. See the v9 migration guide.
  const cookie = `${cookieName}=Fe26.2*1*1e2bacee1edffaeb4a9ba4a07dc36c2c60d20415a60ac1b901033af1f107ead5*LAC9Fn3BJ9ifKMhVL3pP5w*JHhcByIzk4ThLt9rUW-fDMrOwUT7htHy1uyqeOTIqrVwDJ0Bz7TOAwIz_Cos-ug3**7dfa11868bbcc4f7e118342c0280ff49ba4a7cc84c70395bbc3d821a5f460174*6a8FkHxdg322jyym6PwJf3owz7pd6nq5ZIzyLHGVC0c`;

  const session = await getSession({ headers: { cookie } } as IncomingMessage, {} as Response, {
    cookieName,
    password,
  });

  // The caller's `session.user` is undefined, so the app treats this as signed out.
  equal((session as { user?: { id: number } }).user, undefined);
});

await test("should not let the unauthenticated version marker reshape the session", async () => {
  // Same v9 seal, replayed with every version marker an attacker could write.
  // The marker is outside the HMAC, so none of them may change the outcome.
  const seal = await sealData({ user: { id: 77 } }, { password, ttl: 0 });
  const sealWithoutVersion = seal.split("~")[0];

  for (const marker of ["~1", "~2", "~999", "~NaN", "~2abc", "", "~"]) {
    const session = await getSession(
      {
        headers: { cookie: `${cookieName}=${sealWithoutVersion}${marker}` },
      } as IncomingMessage,
      {} as Response,
      { cookieName, password, ttl: 0 },
    );
    deepEqual(
      { user: (session as { user?: { id: number } }).user },
      { user: { id: 77 } },
      `version marker ${JSON.stringify(marker)} changed the session shape`,
    );
  }
});

await test("should start a fresh session for cookie values that are not seals", async () => {
  // These reach iron-webcrypto with error messages that v8's regex allowlist
  // did not cover ("Wrong mac prefix", "Invalid expiration"), so they escaped
  // as a 500 on every request from a browser holding such a cookie. An
  // HttpOnly cookie the app cannot clear made that state sticky.
  const reasons: string[] = [];

  for (const value of [
    "a*b*c*d*e*f*g*h", // Wrong mac prefix
    "Fe26.2*1*aa*bb*cc*zz*dd*ee", // Invalid expiration
    "garbage",
    "~",
    "Fe26.2**",
  ]) {
    const session = await getSession(
      { headers: { cookie: `${cookieName}=${value}` } } as IncomingMessage,
      {} as Response,
      {
        cookieName,
        password,
        onUnsealError: (reason) => reasons.push(reason),
      },
    );
    deepEqual({ ...session }, {}, `value ${JSON.stringify(value)} should reset`);
  }

  // Every failure is still reported, so this is observable rather than silent.
  equal(reasons.length, 5);
  deepEqual([...new Set(reasons)], ["invalid"]);
});

await test("should report expired and unknown-password seals to onUnsealError", async () => {
  const reasons: string[] = [];
  const seal = await sealData({ user: { id: 1 } }, { password, ttl: 61 });

  // Sealed with password id 1, read with a map that only has id 2.
  await getSession(
    { headers: { cookie: `${cookieName}=${seal}` } } as IncomingMessage,
    {} as Response,
    {
      cookieName,
      password: { 2: "Xf9wKqZ2mNvB7cJ4hR6tY8uI0oP3aS5d" },
      onUnsealError: (reason) => reasons.push(reason),
    },
  );

  deepEqual(reasons, ["unknown-password"]);
});

await test("should prevent reassignment of save/destroy functions", async () => {
  const session = await getSession({ headers: {} } as IncomingMessage, {} as Response, {
    cookieName,
    password,
  });

  // Node says "Cannot assign to read only property 'save'", Bun says
  // "Attempted to assign to readonly property". Match the behaviour, not the
  // wording, or this test only passes on one runtime.
  const readOnly = /read.?only property/iu;

  await rejects(async () => {
    // @ts-expect-error assigning to a readonly property is the thing under test
    session.save = () => {};
  }, readOnly);

  await rejects(async () => {
    // @ts-expect-error assigning to a readonly property is the thing under test
    session.destroy = () => {};
  }, readOnly);
});

await test("allow to update session configuration", async () => {
  const res = {
    getHeader: mock.fn(),
    setHeader: mock.fn(),
  };

  const session = await getSession(
    { headers: {} } as IncomingMessage,
    res as unknown as ServerResponse,
    {
      cookieName,
      password,
    },
  );
  session.user = { id: 1 };

  session.updateConfig({ ttl: 61, cookieName: "test2", password });

  await session.save();
  match(res.setHeader.mock.calls[0]?.arguments[1][0], /Max-Age=1;/);

  mock.reset();
});

await test("updateConfig should actually apply a new password", async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() };
  const rotated = "Ck7qLm2XvB9nR4tY6uI8oP0aS3dF5gH1";

  const session = await getSession(
    { headers: {} } as IncomingMessage,
    res as unknown as ServerResponse,
    {
      cookieName,
      password,
    },
  );
  session.user = { id: 1 };

  session.updateConfig({ cookieName, password: rotated });
  await session.save();

  const setCookie = res.setHeader.mock.calls[0]?.arguments[1][0] as string;
  const seal = setCookie.slice(`${cookieName}=`.length).split(";")[0] ?? "";

  // The password map was captured once and closed over by save(), so passing a
  // new password to updateConfig() kept sealing with the old one. A rotation
  // that silently does not happen is worse than one that throws.
  deepEqual(await unsealData(seal, { password: rotated }), { user: { id: 1 } });
  deepEqual(await unsealData(seal, { password }), {});

  mock.reset();
});

await test("updateConfig should validate the new password", async () => {
  const session = await getSession({ headers: {} } as IncomingMessage, {} as Response, {
    cookieName,
    password,
  });

  // updateConfig bypassed every check in the constructor, so a too-short
  // password was accepted here and then failed deep inside the crypto layer.
  throws(
    () => session.updateConfig({ cookieName, password: "too-short" }),
    /at least 32 characters/,
  );
});

await test("should refuse to save a destroyed session", async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() };

  const session = await getSession(
    { headers: {} } as IncomingMessage,
    res as unknown as ServerResponse,
    {
      cookieName,
      password,
    },
  );
  session.user = { id: 1 };
  await session.save();

  session.destroy();

  // destroy() only cleared the object and queued an expired cookie, so a later
  // save() re-sealed the session and the last Set-Cookie won. A wrapper
  // refreshing a rolling expiry at end of request cancelled every logout.
  await rejects(async () => session.save(), /Cannot save a destroyed session/);

  const headers = res.setHeader.mock.calls.map((call) => call.arguments[1] as string[]);
  const last = headers.at(-1)?.at(-1) ?? "";
  match(last, /Max-Age=0/);

  mock.reset();
});

await test("should reject cookieOptions.expires in the past", async () => {
  // A module-scope `expires` is evaluated once per process and drifts into the
  // past, after which the browser discards every cookie we set. That reads as
  // "works locally, works after deploy, then randomly stops" (#910).
  await rejects(
    getSession({ headers: {} } as IncomingMessage, {} as Response, {
      cookieName,
      password,
      cookieOptions: { expires: new Date(Date.now() - 1000) },
    }),
    /expires is in the past/,
  );
});

await test("should work with standard web Request/Response APIs", async () => {
  const req = new Request("https://example.com");
  const res = new Response("Hello, world!");

  let session = await getSession(req, res, { cookieName, password });
  deepEqual(session, {});

  session.user = { id: 1 };
  await session.save();

  const cookie = res.headers.get("set-cookie") ?? "";
  match(cookie, /^test=.{265}; Max-Age=1209540; Path=\/; HttpOnly; Secure; SameSite=Lax$/);

  req.headers.set("cookie", cookie.split(";")[0] ?? "");
  session = await getSession(req, res, { cookieName, password });
  deepEqual(session, { user: { id: 1 } });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adapters. The cookie-store path had no test coverage at all before v9, which
// is how the two code paths managed to drift apart in the first place.
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal stand-in for `await cookies()` from next/headers. */
function fakeCookieStore(initial: Record<string, string> = {}) {
  const jar = new Map(Object.entries(initial));
  const sets: { name: string; value: string; options?: unknown }[] = [];

  return {
    store: {
      get: (name: string) => {
        const value = jar.get(name);
        return value === undefined ? undefined : { name, value };
      },
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      set: (name: string, value: string, options?: unknown) => {
        jar.set(name, value);
        sets.push({ name, value, options });
      },
    },
    sets,
  };
}

await test("cookie store: should round-trip a session", async () => {
  const { store, sets } = fakeCookieStore();

  const session = await getIronSession<Data>(store, { cookieName, password });
  deepEqual({ ...session }, {});

  session.user = { id: 42 };
  await session.save();

  equal(sets.length, 1);
  equal(sets[0]?.name, cookieName);

  const restored = await getIronSession<Data>(store, { cookieName, password });
  deepEqual({ ...restored }, { user: { id: 42 } });
});

await test("cookie store: should apply the default cookie options", async () => {
  const { store, sets } = fakeCookieStore();
  const session = await getIronSession<Data>(store, { cookieName, password });
  session.user = { id: 1 };
  await session.save();

  deepEqual(sets[0]?.options, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 1209540,
  });
});

await test("cookie store: destroy should expire the cookie", async () => {
  const { store, sets } = fakeCookieStore();
  const session = await getIronSession<Data>(store, { cookieName, password });
  session.user = { id: 1 };
  await session.save();
  session.destroy();

  equal(sets.at(-1)?.value, "");
  equal((sets.at(-1)?.options as { maxAge: number } | undefined)?.maxAge, 0);
});

await test("cookie store: should reset a tampered cookie instead of throwing", async () => {
  const seal = await sealData({ user: { id: 1 } }, { password });
  // Flip a character inside the encrypted body so the HMAC no longer matches.
  const middle = Math.floor(seal.length / 2);
  const flipped = seal[middle] === "a" ? "b" : "a";
  const tampered = seal.slice(0, middle) + flipped + seal.slice(middle + 1);
  const { store } = fakeCookieStore({ [cookieName]: tampered });

  const reasons: string[] = [];
  const session = await getIronSession<Data>(store, {
    cookieName,
    password,
    onUnsealError: (reason) => reasons.push(reason),
  });

  deepEqual({ ...session }, {});
  deepEqual(reasons, ["invalid"]);
});

await test("cookie store: should measure the real cookie size", async () => {
  const { store } = fakeCookieStore();
  const session = await getIronSession<Record<string, string>>(store, { cookieName, password });
  session.blob = "a".repeat(4096);

  // The old cookie-store path estimated the size with
  // `name.length + seal.length + JSON.stringify(options).length`, a different
  // number than the Node path used, so the same data was accepted by one and
  // rejected by the other.
  await rejects(async () => session.save(), /Cookie length is too big/);
});

await test("nextProxyCookies: should write to both response and request", async () => {
  const requestJar = fakeCookieStore();
  const responseJar = fakeCookieStore();

  const session = await getIronSession<Data>(
    nextProxyCookies({ cookies: requestJar.store }, { cookies: responseJar.store }),
    { cookieName, password },
  );

  session.user = { id: 7 };
  await session.save();

  // The response carries it to the browser. Next only merges a middleware
  // cookie into the current render when it goes through response.cookies.set().
  equal(responseJar.sets.length, 1);
  // The request makes it readable by the rest of the same request, which is
  // what makes rotation work (#709, #684, #887).
  equal(requestJar.sets.length, 1);

  const sameRequest = await getIronSession<Data>(
    nextProxyCookies({ cookies: requestJar.store }, { cookies: responseJar.store }),
    { cookieName, password },
  );
  deepEqual({ ...sameRequest }, { user: { id: 7 } });
});

await test("nodeCookies: should keep cookies set by other code", async () => {
  const res = {
    getHeader: mock.fn(() => "other=1"),
    setHeader: mock.fn(),
    headersSent: false,
  };

  const session = await getIronSession<Data>(
    nodeCookies({ headers: {} } as IncomingMessage, res as unknown as ServerResponse),
    { cookieName, password },
  );
  session.user = { id: 1 };
  await session.save();

  const written = res.setHeader.mock.calls[0]?.arguments[1] as string[];
  equal(written.length, 2);
  equal(written[0], "other=1");
  match(written[1] ?? "", /^test=/u);

  mock.reset();
});

await test("nodeCookies: should throw when headers are already sent", async () => {
  const res = {
    getHeader: mock.fn(),
    setHeader: mock.fn(),
    headersSent: true,
  };

  const session = await getIronSession<Data>(
    nodeCookies({ headers: {} } as IncomingMessage, res as unknown as ServerResponse),
    { cookieName, password },
  );

  await rejects(async () => session.save(), /after headers were sent/);
  mock.reset();
});

await test("webCookies: should write into a bare Headers", async () => {
  const request = new Request("https://example.com");
  const headers = new Headers();

  const session = await getIronSession<Data>(webCookies(request, headers), {
    cookieName,
    password,
  });
  session.user = { id: 3 };
  await session.save();

  match(
    headers.get("set-cookie") ?? "",
    /^test=.+; Max-Age=1209540; Path=\/; HttpOnly; Secure; SameSite=Lax$/u,
  );
});

await test("webCookies: should throw when the response body was already consumed", async () => {
  const request = new Request("https://example.com");
  const response = new Response("already read");
  await response.text();

  const session = await getIronSession<Data>(webCookies(request, response), {
    cookieName,
    password,
  });
  session.user = { id: 1 };

  // Mutating headers on a response the runtime has started sending is ignored
  // without complaining, which loses the session silently.
  await rejects(async () => session.save(), /already been consumed/);
});
