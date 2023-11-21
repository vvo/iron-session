import { deepEqual, doesNotMatch, equal, match, rejects } from "node:assert";
import { mock, test } from "node:test";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { SessionOptions } from "./index.js";
import { getIronSession, sealData } from "./index.js";

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

  const session = await getSession(
    { headers: {} } as Request,
    res as unknown as ServerResponse,
    {
      cookieName,
      password,
    },
  );
  session.user = { id: 1 };
  await session.save();

  const [name, value] = res.setHeader.mock.calls[0]?.arguments ?? [];
  equal(name, "set-cookie");
  match(
    value[0],
    /^test=.{265}; Max-Age=1209540; Path=\/; HttpOnly; Secure; SameSite=Lax$/,
  );

  mock.reset();
});

await test("should allow deleting then saving session data", async () => {
  const res = { getHeader: mock.fn(), setHeader: mock.fn() };

  let session = await getSession(
    { headers: {} } as Request,
    res as unknown as ServerResponse,
    {
      cookieName,
      password,
    },
  );
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

  const session = await getSession(
    req as IncomingMessage,
    {} as unknown as ServerResponse,
    { cookieName, password: secondPassword },
  );
  deepEqual(session, {});
});

await test("should decrypt cookie generated from older password", async () => {
  const firstPassword = password;
  const secondPassword = "12345678901234567890123456789012";

  const seal = await sealData({ user: { id: 1 } }, { password: firstPassword });
  const req = { headers: { cookie: `${cookieName}=${seal}` } };

  const passwords = { 2: secondPassword, 1: firstPassword }; // rotation
  const session = await getSession(
    req as IncomingMessage,
    {} as unknown as ServerResponse,
    { cookieName, password: passwords },
  );
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

  await rejects(
    session.save(),
    /session.save\(\) was called after headers were sent/,
  );
});

await test("should keep previously set cookie - single", async () => {
  const existingCookie = "existing=cookie";
  const res = {
    getHeader: mock.fn(() => existingCookie),
    setHeader: mock.fn(),
  };

  const session = await getSession(
    { headers: {} } as IncomingMessage,
    res as unknown as Response,
    {
      cookieName,
      password,
    },
  );
  session.user = { id: 1 };
  await session.save();

  let cookies = res.setHeader.mock.calls[0]?.arguments[1];
  deepEqual(cookies[0], existingCookie);
  deepEqual(cookies.length, 2);

  session.destroy();

  cookies = res.setHeader.mock.calls[1]?.arguments[1];
  deepEqual(cookies[0], existingCookie);
  deepEqual(
    cookies[1],
    `${cookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );

  mock.reset();
});

await test("should keep previously set cookies - multiple", async () => {
  const existingCookies = ["existing=cookie", "existing2=cookie2"];
  const res = {
    getHeader: mock.fn(() => existingCookies),
    setHeader: mock.fn(),
  };

  const session = await getSession(
    { headers: {} } as Request,
    res as unknown as Response,
    {
      cookieName,
      password,
    },
  );
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
  deepEqual(
    cookies[2],
    `${cookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );

  mock.reset();
});

await test("should be backwards compatible with older cookie format", async () => {
  // this seal is in the old next-iron-session format (generated with ttl: 0)
  const cookie = `${cookieName}=Fe26.2*1*1e2bacee1edffaeb4a9ba4a07dc36c2c60d20415a60ac1b901033af1f107ead5*LAC9Fn3BJ9ifKMhVL3pP5w*JHhcByIzk4ThLt9rUW-fDMrOwUT7htHy1uyqeOTIqrVwDJ0Bz7TOAwIz_Cos-ug3**7dfa11868bbcc4f7e118342c0280ff49ba4a7cc84c70395bbc3d821a5f460174*6a8FkHxdg322jyym6PwJf3owz7pd6nq5ZIzyLHGVC0c`;

  const session = await getSession(
    { headers: { cookie } } as IncomingMessage,
    {} as Response,
    { cookieName, password },
  );
  deepEqual(session, { user: { id: 77 } });
});

await test("should prevent reassignment of save/destroy functions", async () => {
  const session = await getSession(
    { headers: {} } as IncomingMessage,
    {} as Response,
    { cookieName, password },
  );

  await rejects(async () => {
    // @ts-expect-error Runtime check
    session.save = () => {};
  }, /Cannot assign to read only property 'save' of object '#<Object>'/);

  await rejects(async () => {
    // @ts-expect-error Runtime check
    session.destroy = () => {};
  }, /Cannot assign to read only property 'destroy' of object '#<Object>'/);
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

  session.updateConfig({ ttl: 61, cookieName: "test2", password: "ok" });

  await session.save();
  match(res.setHeader.mock.calls[0]?.arguments[1][0], /Max-Age=1;/);

  mock.reset();
});

await test("should work with standard web Request/Response APIs", async () => {
  const req = new Request("https://example.com");
  const res = new Response("Hello, world!");

  let session = await getSession(req, res, { cookieName, password });
  deepEqual(session, {});

  session.user = { id: 1 };
  await session.save();

  const cookie = res.headers.get("set-cookie") ?? "";
  match(
    cookie,
    /^test=.{265}; Max-Age=1209540; Path=\/; HttpOnly; Secure; SameSite=Lax$/,
  );

  req.headers.set("cookie", cookie.split(";")[0] ?? "");
  session = await getSession(req, res, { cookieName, password });
  deepEqual(session, { user: { id: 1 } });
});
