import type { IncomingMessage, ServerResponse } from "http";
import { getIronSession, IronSessionOptions, sealData } from ".";

const password = "Gbm49ATjnqnkCCCdhV4uDBhbfnPqsCW0";
const cookieName = "test";
const defaultReq = {
  headers: {},
  socket: {
    encrypted: true,
  },
} as unknown as IncomingMessage;
const defaultRes = {} as ServerResponse;
const defaultOptions: IronSessionOptions = {
  password,
  cookieName,
};

declare module "iron-session" {
  interface IronSessionData {
    user?: { id: number; meta?: string };
    admin?: boolean;
  }
}

test("no req", async () => {
  // @ts-ignore we actually want to test this
  await expect(getIronSession()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"iron-session: Bad usage. Minimum usage is const session = await getIronSession(req, res, { cookieName: \\"...\\", password: \\"...\\". Check the usage here: https://github.com/vvo/iron-session"`,
  );
});

test("no res", async () => {
  // @ts-ignore we actually want to test this
  await expect(getIronSession({})).rejects.toThrowErrorMatchingInlineSnapshot(
    `"iron-session: Bad usage. Minimum usage is const session = await getIronSession(req, res, { cookieName: \\"...\\", password: \\"...\\". Check the usage here: https://github.com/vvo/iron-session"`,
  );
});

test("no password", async () => {
  await expect(
    // @ts-ignore we actually want to test this
    getIronSession({}, {}),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"iron-session: Bad usage. Minimum usage is const session = await getIronSession(req, res, { cookieName: \\"...\\", password: \\"...\\". Check the usage here: https://github.com/vvo/iron-session"`,
  );
});

test("no cookie name", async () => {
  await expect(
    // @ts-ignore we actually want to test this
    getIronSession({}, {}, { password }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"iron-session: Bad usage. Minimum usage is const session = await getIronSession(req, res, { cookieName: \\"...\\", password: \\"...\\". Check the usage here: https://github.com/vvo/iron-session"`,
  );
});

test("bad password length", async () => {
  await expect(
    // @ts-ignore we actually want to test this
    getIronSession({}, {}, { password: password.substring(1), cookieName }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"iron-session: Bad usage. Password must be at least 32 characters long."`,
  );
});

test("getSession(req, res, options)", async () => {
  const session = await getIronSession(defaultReq, defaultRes, defaultOptions);
  expect(session).toMatchInlineSnapshot(`Object {}`);
});

test("session.save", async () => {
  const res = {
    getHeader: jest.fn(),
    setHeader: jest.fn(),
  };

  const session = await getIronSession(
    defaultReq,
    res as unknown as ServerResponse,
    defaultOptions,
  );

  session.user = { id: 100 };

  await session.save();
  const headerName = res.setHeader.mock.calls[0][0];
  expect(headerName).toMatchInlineSnapshot(`"set-cookie"`);

  const headerValue = res.setHeader.mock.calls[0][1];
  expect(Array.isArray(headerValue)).toBe(true);
  expect(headerValue).toHaveLength(1);

  const cookie = headerValue[0];
  const seal = cookie.split(";")[0].split("=")[1];
  expect(seal).toHaveLength(265);

  const cookieParams = cookie.split(";").slice(1).join(";");
  expect(cookieParams).toMatchInlineSnapshot(
    `" Max-Age=1295940; Path=/; HttpOnly; Secure; SameSite=Lax"`,
  );
});

test("delete session.* and session.save", async () => {
  const res = {
    getHeader: jest.fn(),
    setHeader: jest.fn(),
  };

  const firstSession = await getIronSession(
    defaultReq,
    res as unknown as ServerResponse,
    defaultOptions,
  );

  firstSession.user = { id: 100 };

  await firstSession.save();
  const firstCookie = res.setHeader.mock.calls[0][1][0].split(";")[0];

  res.setHeader.mockClear();

  const secondSession = await getIronSession(
    {
      ...defaultReq,
      headers: { cookie: firstCookie },
    } as IncomingMessage,
    res as unknown as ServerResponse,
    defaultOptions,
  );

  delete secondSession.user;

  await secondSession.save();

  const secondCookie = res.setHeader.mock.calls[0][1][0].split(";")[0];

  const thirdSession = await getIronSession(
    {
      ...defaultReq,
      headers: { cookie: secondCookie },
    } as IncomingMessage,
    res as unknown as ServerResponse,
    defaultOptions,
  );

  expect(thirdSession).toMatchInlineSnapshot(`Object {}`);
});

test("When ttl is 0 (infinite session), maxAge is very far away", async () => {
  const res = {
    getHeader: jest.fn(),
    setHeader: jest.fn(),
  };

  const session = await getIronSession(
    defaultReq,
    res as unknown as ServerResponse,
    { ...defaultOptions, ttl: 0 },
  );

  await session.save();
  const headerValue = res.setHeader.mock.calls[0][1];
  const cookie = headerValue[0];
  const maxAgeParam = cookie.split(";")[1].trim();
  expect(maxAgeParam).toMatchInlineSnapshot(`"Max-Age=2147483587"`);
});

test("Passing down a maxAge option", async () => {
  const res = {
    getHeader: jest.fn(),
    setHeader: jest.fn(),
  };

  const session = await getIronSession(
    defaultReq,
    res as unknown as ServerResponse,
    {
      ...defaultOptions,
      ttl: 0,
      cookieOptions: { maxAge: 1000 },
    },
  );

  await session.save();
  const headerValue = res.setHeader.mock.calls[0][1];
  const cookie = headerValue[0];
  const maxAgeParam = cookie.split(";")[1].trim();
  expect(maxAgeParam).toMatchInlineSnapshot(`"Max-Age=940"`);
});

test("Passing down maxAge = undefined (session cookies)", async () => {
  const res = {
    getHeader: jest.fn(),
    setHeader: jest.fn(),
  };

  const session = await getIronSession(
    defaultReq,
    res as unknown as ServerResponse,
    {
      ...defaultOptions,
      cookieOptions: { maxAge: undefined },
    },
  );

  await session.save();
  const headerValue = res.setHeader.mock.calls[0][1];
  const cookie = headerValue[0].split(";");
  cookie.shift();
  expect(cookie).toMatchInlineSnapshot(`
    Array [
      " Path=/",
      " HttpOnly",
      " Secure",
      " SameSite=Lax",
    ]
  `);
});

test("session.destroy", async () => {
  const res = {
    getHeader: jest.fn(),
    setHeader: jest.fn(),
  };

  const session = await getIronSession(
    defaultReq,
    res as unknown as ServerResponse,
    defaultOptions,
  );

  session.user = { id: 88 };

  expect(session).toMatchInlineSnapshot(`
    Object {
      "user": Object {
        "id": 88,
      },
    }
  `);

  session.destroy();

  expect(session).toMatchInlineSnapshot(`Object {}`);

  expect(res.setHeader.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      "set-cookie",
      Array [
        "test=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
      ],
    ]
  `);
});

test("When trying to use an expired seal", async () => {
  jest.useFakeTimers();

  // 100 seconds seal ttl
  const ttl = 100;

  jest.setSystemTime(0);

  const data = { user: { id: 20 } };
  const seal = await sealData(data, { password, ttl });

  const firstReq = {
    ...defaultReq,
    headers: { cookie: `test=${seal}` },
  } as IncomingMessage;

  const firstSession = await getIronSession(firstReq, defaultRes, {
    password,
    cookieName,
    ttl,
  });

  expect(firstSession).toMatchInlineSnapshot(`
    Object {
      "user": Object {
        "id": 20,
      },
    }
  `);

  jest.setSystemTime((ttl + 60) * 1000);

  const secondReq = {
    ...defaultReq,
    headers: { cookie: `test=${seal}` },
  } as IncomingMessage;

  const secondSession = await getIronSession(secondReq, defaultRes, {
    password,
    cookieName,
    ttl,
  });

  // now the session is empty, automatically
  expect(secondSession).toMatchInlineSnapshot(`Object {}`);

  jest.useRealTimers();
});

test("Session is refreshed (ttl, maxAge) when saves happens", async () => {
  const res = {
    getHeader: jest.fn(),
    setHeader: jest.fn(),
  };

  jest.useFakeTimers();

  // 100 seconds seal ttl
  const ttl = 100;

  jest.setSystemTime(0);

  const firstSession = await getIronSession(
    defaultReq,
    res as unknown as ServerResponse,
    {
      password,
      cookieName,
      ttl,
    },
  );

  firstSession.user = { id: 42 };

  await firstSession.save();

  const firstCookie = res.setHeader.mock.calls[0][1][0];
  res.setHeader.mockClear();
  res.getHeader.mockClear();

  expect(firstCookie.split(";")[1].trim()).toMatchInlineSnapshot(
    `"Max-Age=40"`,
  );

  jest.setSystemTime((ttl + 30) * 1000);

  const secondSession = await getIronSession(
    {
      ...defaultReq,
      headers: { cookie: firstCookie.split(";")[0] }, // this is the test=seal part
    } as IncomingMessage,
    res as unknown as ServerResponse,
    {
      password,
      cookieName,
      ttl,
    },
  );

  expect(secondSession).toMatchInlineSnapshot(`
    Object {
      "user": Object {
        "id": 42,
      },
    }
  `);

  // at this point the session is valid up to ttl + 30 + 100 + 59
  await secondSession.save();

  const secondCookie = res.setHeader.mock.calls[0][1][0];

  // max age should stay the same as previously because it is relative to the time the cookie is set
  // max age is set to ttl - 60 so the cookie expires before the seal expires, avoiding errors
  expect(secondCookie.split(";")[1].trim()).toMatchInlineSnapshot(
    `"Max-Age=40"`,
  );

  res.setHeader.mockClear();
  res.getHeader.mockClear();

  jest.setSystemTime((ttl + 30 + ttl + 30) * 1000);

  const thirdSession = await getIronSession(
    {
      ...defaultReq,
      headers: { cookie: secondCookie.split(";")[0] },
    } as IncomingMessage,
    res as unknown as ServerResponse,
    {
      password,
      cookieName,
      ttl,
    },
  );

  // if the session ttl was not pushed after each save then this would be an empty object here
  expect(thirdSession).toMatchInlineSnapshot(`
    Object {
      "user": Object {
        "id": 42,
      },
    }
  `);

  jest.useRealTimers();
});

test("When mixing passwords between seals, the session is automatically reset. Example: password was updated server-side without rotation.", async () => {
  const firstPassword = "Bb0EyombqcDK58k870btymbGJrgZFrN2";
  const secondPassword = "182XhM1mAzottfvzPMN0nh20HMwZprBc";

  const seal = await sealData(
    { user: { id: 77 } },
    { password: firstPassword, ttl: 0 },
  );

  const session = await getIronSession(
    {
      ...defaultReq,
      headers: { cookie: `test=${seal}` },
    } as IncomingMessage,
    defaultRes,
    { password: secondPassword, cookieName },
  );

  expect(session).toMatchInlineSnapshot(`Object {}`);
});

test("Password rotation", async () => {
  const firstPassword = { 1: "BcTv8NKLVfGcTt18HqGf2DhEnmJrLbNU" };
  const secondPassword = {
    // any of these passwords will try to decrypt the seal
    // only the most recent one (2: "...") one will be used to encrypt new seals
    2: "scKVNPWFippYjA3tRjJPuPnK7ocj4Vnn",
    ...firstPassword,
  };

  const seal = await sealData(
    { user: { id: 30 } },
    { password: firstPassword },
  );

  const session = await getIronSession(
    {
      ...defaultReq,
      headers: { cookie: `test=${seal}` },
    } as IncomingMessage,
    defaultRes,
    { password: secondPassword, cookieName },
  );

  expect(session).toMatchInlineSnapshot(`
    Object {
      "user": Object {
        "id": 30,
      },
    }
  `);
});

test("it throws when cookie length is too big", async () => {
  const session = await getIronSession(defaultReq, defaultRes, defaultOptions);

  session.user = { id: 20, meta: "somevalue".repeat(500) };

  await expect(session.save()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"iron-session: Cookie length is too big 6343, browsers will refuse it. Try to remove some data."`,
  );
});

test("it keeps previously set cookies (single value)", async () => {
  const res = {
    getHeader: function () {
      return "existingCookie=value";
    },
    setHeader: jest.fn(),
  };

  const session = await getIronSession(
    defaultReq,
    res as unknown as ServerResponse,
    defaultOptions,
  );

  await session.save();

  const headerValue = res.setHeader.mock.calls[0][1];
  expect(headerValue.length).toBe(2);
  expect(headerValue[0]).toBe("existingCookie=value");
});

test("it throws when calling save() and headers were already sent", async () => {
  const session = await getIronSession(
    defaultReq,
    {
      headersSent: true,
    } as unknown as ServerResponse,
    defaultOptions,
  );

  await expect(session.save()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"iron-session: Cannot set session cookie: session.save() was called after headers were sent. Make sure to call it before any res.send() or res.end()"`,
  );
});

test("it keeps previously set cookies (multiple values)", async () => {
  const res = {
    getHeader: function () {
      return ["existingCookie=value", "anotherCookie=value2"];
    },
    setHeader: jest.fn(),
  };

  const session = await getIronSession(
    defaultReq,
    res as unknown as ServerResponse,
    defaultOptions,
  );

  await session.save();

  const headerValue = res.setHeader.mock.calls[0][1];
  expect(headerValue.length).toBe(3);
  expect(headerValue[0]).toBe("existingCookie=value");
  expect(headerValue[1]).toBe("anotherCookie=value2");
});

test("it keeps previously set cookies (multiple values) on destroy()", async () => {
  const res = {
    getHeader: function () {
      return ["existingCookie=value", "anotherCookie=value2"];
    },
    setHeader: jest.fn(),
  };

  const session = await getIronSession(
    defaultReq,
    res as unknown as ServerResponse,
    defaultOptions,
  );

  session.destroy();

  expect(res.setHeader.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      "set-cookie",
      Array [
        "existingCookie=value",
        "anotherCookie=value2",
        "test=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
      ],
    ]
  `);
});

test("getSession with a previous (next-iron-session) session cookie", async () => {
  const session = await getIronSession(
    {
      ...defaultReq,
      headers: {
        cookie:
          // this seal was previously generated with a ttl of 0
          "test=Fe26.2*1*1e2bacee1edffaeb4a9ba4a07dc36c2c60d20415a60ac1b901033af1f107ead5*LAC9Fn3BJ9ifKMhVL3pP5w*JHhcByIzk4ThLt9rUW-fDMrOwUT7htHy1uyqeOTIqrVwDJ0Bz7TOAwIz_Cos-ug3**7dfa11868bbcc4f7e118342c0280ff49ba4a7cc84c70395bbc3d821a5f460174*6a8FkHxdg322jyym6PwJf3owz7pd6nq5ZIzyLHGVC0c",
      },
    } as unknown as IncomingMessage,
    defaultRes,
    defaultOptions,
  );

  expect(session.user).toMatchInlineSnapshot(`
    Object {
      "id": 77,
    }
  `);
});

test("it throws when trying to reassign save or destroy", async () => {
  const session = await getIronSession(defaultReq, defaultRes, defaultOptions);
  expect(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    session.save = async () => {};
  }).toThrowErrorMatchingInlineSnapshot(
    `"Cannot assign to read only property 'save' of object '#<Object>'"`,
  );
  expect(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    session.destroy = async () => {};
  }).toThrowErrorMatchingInlineSnapshot(
    `"Cannot assign to read only property 'destroy' of object '#<Object>'"`,
  );
});
