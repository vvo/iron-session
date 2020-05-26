import { advanceBy, clear } from "jest-date-mock";
import ironStore from "iron-store";

import { withIronSession, ironSession, applySession } from "./index.js";

const password = "Gbm49ATjnqnkCCCdhV4uDBhbfnPqsCW0";
const cookieName = "test";

test("without a password", () => {
  return new Promise((done) => {
    const handler = () => {};
    expect(() => {
      withIronSession(handler, { cookieName });
    }).toThrowErrorMatchingInlineSnapshot(
      `"next-iron-session: Missing parameter \`password\`"`,
    );
    done();
  });
});

test("without a cookieName", () => {
  return new Promise((done) => {
    const handler = () => {};
    expect(() => {
      withIronSession(handler, { password });
    }).toThrowErrorMatchingInlineSnapshot(
      `"next-iron-session: Missing parameter \`cookieName\`"`,
    );
    done();
  });
});

test("withSession((req, res) => {}, {password, cookieName})", () => {
  return new Promise((done) => {
    const handler = (req, res) => {
      expect(req).toMatchInlineSnapshot(`
        Object {
          "headers": Object {
            "cookie": "sg=1",
          },
          "session": Object {
            "destroy": [Function],
            "get": [Function],
            "save": [Function],
            "set": [Function],
            "unset": [Function],
          },
        }
      `);
      expect(res).toMatchInlineSnapshot(`
        Object {
          "json": [Function],
        }
      `);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, cookieName });
    wrappedHandler(
      {
        headers: { cookie: "sg=1" },
      },
      { json: function () {} },
    );
  });
});

test("withSession(({req, res}) => {}, {password, cookieName})", () => {
  return new Promise((done) => {
    const handler = ({ req, res }) => {
      expect(req).toMatchInlineSnapshot(`
        Object {
          "headers": Object {
            "cookie": "ssr=1",
          },
          "session": Object {
            "destroy": [Function],
            "get": [Function],
            "save": [Function],
            "set": [Function],
            "unset": [Function],
          },
        }
      `);
      expect(res).toMatchInlineSnapshot(`
        Object {
          "json": [Function],
        }
      `);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, cookieName });
    wrappedHandler({
      req: { headers: { cookie: "ssr=1" } },
      res: { json: function () {} },
    });
  });
});

test("req.session.set", () => {
  return new Promise((done) => {
    const handler = (req) => {
      expect(req.session.set("user", { id: 20 })).toMatchInlineSnapshot(`
        Object {
          "id": 20,
        }
      `);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, cookieName });
    wrappedHandler(
      {
        headers: { cookie: "" },
      },
      {},
    );
  });
});

test("req.session.unset", () => {
  return new Promise((done) => {
    const handler = (req) => {
      req.session.set("state", { id: 20 });
      expect(req.session.get("state")).toMatchInlineSnapshot(`
        Object {
          "id": 20,
        }
      `);
      req.session.unset("state");
      expect(req.session.get("state")).toMatchInlineSnapshot(`undefined`);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, cookieName });
    wrappedHandler(
      {
        headers: { cookie: "" },
      },
      {},
    );
  });
});

test("req.session.save creates a seal and stores it in a cookie", () => {
  return new Promise((done) => {
    const handler = async (req, res) => {
      await req.session.save();
      const headerName = res.setHeader.mock.calls[0][0];
      expect(headerName).toMatchInlineSnapshot(`"set-cookie"`);

      const headerValue = res.setHeader.mock.calls[0][1];
      expect(Array.isArray(headerValue)).toBe(true);
      expect(headerValue).toHaveLength(1);

      const cookie = headerValue[0];
      const seal = cookie.split(";")[0].split("=")[1];
      expect(seal).toHaveLength(263);

      const cookieParams = cookie.split(";").slice(1).join(";");
      expect(cookieParams).toMatchInlineSnapshot(
        `" Max-Age=1295940; Path=/; HttpOnly; Secure; SameSite=Lax"`,
      );
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, cookieName });
    wrappedHandler(
      {
        headers: { cookie: "" },
      },
      {
        setHeader: jest.fn(),
        getHeader: jest.fn(),
      },
    );
  });
});

test("withSession((req, res) => {}, {password}) with existing session (SG)", async () => {
  return new Promise((done) => {
    const handler = (req) => {
      expect(req.session.get()).toMatchInlineSnapshot(`
        Object {
          "user": Object {
            "id": 3,
          },
        }
      `);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, cookieName });
    wrappedHandler(
      {
        headers: {
          cookie:
            "test=Fe26.2**4e769b9b7b921621ed5658cfc0d7d8e267dc8ee93663c2803c257b31111394e3*jRXOJHmt_BDG9nNTXcVRXQ*UHpK9GYp7SXTiEsxTzTUq_tQD_-ZUp7PguEXy-bRFuBE4fW74-9wm9UtlWO2rlwB**d504d6d197d183efec0ae6d3c2378c43048c8752d6c3c591c92289ed01142b3c*3NG2fCo8A53CXPU8rEAMnDB7X9UkwzTaHieumPBqyTw",
        },
      },
      {},
    );
  });
});

test("withSession(({req, res}) => {}, {password}) with existing session (SSR)", async () => {
  return new Promise((done) => {
    const handler = ({ req }) => {
      expect(req.session.get()).toMatchInlineSnapshot(`
        Object {
          "user": Object {
            "id": 3,
          },
        }
      `);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, cookieName });
    wrappedHandler({
      req: {
        headers: {
          cookie:
            "test=Fe26.2**4e769b9b7b921621ed5658cfc0d7d8e267dc8ee93663c2803c257b31111394e3*jRXOJHmt_BDG9nNTXcVRXQ*UHpK9GYp7SXTiEsxTzTUq_tQD_-ZUp7PguEXy-bRFuBE4fW74-9wm9UtlWO2rlwB**d504d6d197d183efec0ae6d3c2378c43048c8752d6c3c591c92289ed01142b3c*3NG2fCo8A53CXPU8rEAMnDB7X9UkwzTaHieumPBqyTw",
        },
      },
    });
  });
});

test("When ttl is 0, maxAge have a specific value", () => {
  return new Promise((done) => {
    const handler = async (req, res) => {
      await req.session.save();
      const headerValue = res.setHeader.mock.calls[0][1];
      const cookie = headerValue[0];
      const maxAgeParam = cookie.split(";")[1];
      expect(maxAgeParam).toMatchInlineSnapshot(`" Max-Age=2147483587"`);
      done();
    };
    const wrappedHandler = withIronSession(handler, {
      password,
      cookieName,
      ttl: 0,
    });
    wrappedHandler(
      {
        headers: { cookie: "" },
      },
      {
        setHeader: jest.fn(),
        getHeader: jest.fn(),
      },
    );
  });
});

test("req.session.destroy", () => {
  return new Promise((done) => {
    const handler = async (req, res) => {
      req.session.set("user", { id: 12421 });
      req.session.destroy();
      expect(req.session.get()).toMatchInlineSnapshot(`Object {}`);
      expect(res.setHeader.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "set-cookie",
          Array [
            "test=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
          ],
        ]
      `);
      done();
    };
    const wrappedHandler = withIronSession(handler, {
      password,
      cookieName,
      ttl: 0,
    });
    wrappedHandler(
      {
        headers: { cookie: "coucou=true" },
      },
      {
        setHeader: jest.fn(),
      },
    );
  });
});

test("When trying to use an expired seal", async () => {
  const ttl = 100;
  const store = await ironStore({ password, ttl: ttl * 1000 });
  store.set("user", { id: 20 });
  const seal = await store.seal();

  function whenNotExpired() {
    return new Promise((done) => {
      advanceBy(100 * 1000);

      const handler = async (req) => {
        expect(req.session.get("user")).toMatchInlineSnapshot(`
          Object {
            "id": 20,
          }
        `);
        done();
      };
      const wrappedHandler = withIronSession(handler, {
        password,
        cookieName,
        ttl,
      });

      wrappedHandler(
        {
          headers: { cookie: `test=${seal}` },
        },
        {
          setHeader: jest.fn(),
        },
      );
    });
  }

  function whenExpired() {
    return new Promise((done) => {
      advanceBy(60 * 1000);

      const handler = async (req) => {
        expect(req.session.get("user")).toMatchInlineSnapshot(`undefined`);
        done();
      };
      const wrappedHandler = withIronSession(handler, {
        password,
        cookieName,
        ttl,
      });
      wrappedHandler(
        {
          headers: { cookie: `test=${seal}` },
        },
        {
          setHeader: jest.fn(),
        },
      );
    });
  }

  return whenNotExpired().then(whenExpired).then(clear);
});

test("It throws Iron errors when passing a wrong password (password length must be >= 32)", async () => {
  const handler = async (req, res) => {
    await req.session.save();
    const headerValue = res.setHeader.mock.calls[0][1];
    const cookie = headerValue[0];
    const maxAgeParam = cookie.split(";")[1];
    expect(maxAgeParam).toMatchInlineSnapshot(`" Max-Age=2147483587"`);
  };
  const wrappedHandler = withIronSession(handler, {
    password: "dsadsadsadsadsadadsa",
    cookieName,
    ttl: 0,
  });
  await expect(
    wrappedHandler(
      {
        headers: {
          cookie:
            "test=Fe26.2**4e769b9b7b921621ed5658cfc0d7d8e267dc8ee93663c2803c257b31111394e3*jRXOJHmt_BDG9nNTXcVRXQ*UHpK9GYp7SXTiEsxTzTUq_tQD_-ZUp7PguEXy-bRFuBE4fW74-9wm9UtlWO2rlwB**d504d6d197d183efec0ae6d3c2378c43048c8752d6c3c591c92289ed01142b3c*3NG2fCo8A53CXPU8rEAMnDB7X9UkwzTaHieumPBqyTw",
        },
      },
      {
        setHeader: jest.fn(),
      },
    ),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Password string too short (min 32 characters required)"`,
  );
});

test("when no cookies at all", () => {
  return new Promise((done) => {
    const handler = (req) => {
      expect(req.session.set("user", { id: 20 })).toMatchInlineSnapshot(`
        Object {
          "id": 20,
        }
      `);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, cookieName });
    wrappedHandler(
      {
        headers: {},
      },
      {},
    );
  });
});

test("When trying to use a wrong seal (example: password was updated server-side without rotation)", async () => {
  const firstPassword = "Bb0EyombqcDK58k870btymbGJrgZFrN2";
  const secondPassword = "182XhM1mAzottfvzPMN0nh20HMwZprBc";

  const store = await ironStore({ password: firstPassword });
  store.set("user", { id: 20 });
  const seal = await store.seal();

  return new Promise((done) => {
    const handler = (req) => {
      expect(req.session.get("user")).toMatchInlineSnapshot(`undefined`);
      done();
    };
    const wrappedHandler = withIronSession(handler, {
      password: secondPassword,
      cookieName,
    });
    wrappedHandler(
      {
        headers: { cookie: `test=${seal}` },
      },
      {},
    );
  });
});

test("moving from <=3.1.2 seals to multi passwords creates a new session", async () => {
  return new Promise((done) => {
    const handler = (req) => {
      expect(req.session.get("user")).toMatchInlineSnapshot(`undefined`);
      done();
    };
    const wrappedHandler = withIronSession(handler, {
      password: [{ id: 1, password }],
      cookieName,
    });
    wrappedHandler(
      {
        headers: {
          cookie:
            "test=Fe26.2**4e769b9b7b921621ed5658cfc0d7d8e267dc8ee93663c2803c257b31111394e3*jRXOJHmt_BDG9nNTXcVRXQ*UHpK9GYp7SXTiEsxTzTUq_tQD_-ZUp7PguEXy-bRFuBE4fW74-9wm9UtlWO2rlwB**d504d6d197d183efec0ae6d3c2378c43048c8752d6c3c591c92289ed01142b3c*3NG2fCo8A53CXPU8rEAMnDB7X9UkwzTaHieumPBqyTw",
        },
      },
      {},
    );
  });
});

test("Password rotation", async () => {
  const firstPassword = [
    { id: 1, password: "BcTv8NKLVfGcTt18HqGf2DhEnmJrLbNU" },
  ];
  const secondPassword = [
    { id: 2, password: "scKVNPWFippYjA3tRjJPuPnK7ocj4Vnn" },
    { id: 1, password: "BcTv8NKLVfGcTt18HqGf2DhEnmJrLbNU" },
  ];

  const store = await ironStore({ password: firstPassword });
  store.set("user", { id: 20 });
  const seal = await store.seal();

  return new Promise((done) => {
    const handler = (req) => {
      expect(req.session.get("user")).toMatchInlineSnapshot(`
        Object {
          "id": 20,
        }
      `);
      done();
    };
    const wrappedHandler = withIronSession(handler, {
      password: secondPassword,
      cookieName,
    });
    wrappedHandler(
      {
        headers: { cookie: `test=${seal}` },
      },
      {},
    );
  });
});

test("Connect middleware ironSession({password, cookieName})", () => {
  return new Promise((done) => {
    const req = {
      headers: { cookie: "sg=1" },
    };
    const res = { json: function () {} };

    const handler = ironSession({ password, cookieName });
    handler(req, res, function () {
      expect(req).toMatchInlineSnapshot(`
        Object {
          "headers": Object {
            "cookie": "sg=1",
          },
          "session": Object {
            "destroy": [Function],
            "get": [Function],
            "save": [Function],
            "set": [Function],
            "unset": [Function],
          },
        }
      `);
      expect(res).toMatchInlineSnapshot(`
        Object {
          "json": [Function],
        }
      `);
      done();
    });
  });
});

test("Express middleware with error", () => {
  return new Promise((done) => {
    const req = {
      headers: {
        cookie:
          "test=Fe26.2**4e769b9b7b921621ed5658cfc0d7d8e267dc8ee93663c2803c257b31111394e3*jRXOJHmt_BDG9nNTXcVRXQ*UHpK9GYp7SXTiEsxTzTUq_tQD_-ZUp7PguEXy-bRFuBE4fW74-9wm9UtlWO2rlwB**d504d6d197d183efec0ae6d3c2378c43048c8752d6c3c591c92289ed01142b3c*3NG2fCo8A53CXPU8rEAMnDB7X9UkwzTaHieumPBqyTw",
      },
    };
    const res = {};

    const handler = ironSession({
      password: "wrong password length",
      cookieName,
    });
    handler(req, res, function (err) {
      expect(err).toMatchInlineSnapshot(
        `[Error: Password string too short (min 32 characters required)]`,
      );
      done();
    });
  });
});

test("applySession(req, res, {password, cookieName})", async () => {
  const req = {
    headers: { cookie: "sg=1" },
  };
  const res = { json: function () {} };

  await applySession(req, res, { password, cookieName });

  expect(req).toMatchInlineSnapshot(`
    Object {
      "headers": Object {
        "cookie": "sg=1",
      },
      "session": Object {
        "destroy": [Function],
        "get": [Function],
        "save": [Function],
        "set": [Function],
        "unset": [Function],
      },
    }
  `);
  expect(res).toMatchInlineSnapshot(`
    Object {
      "json": [Function],
    }
  `);
});

test("applySession(req, res, {cookieName})", async () => {
  const req = {};
  const res = {};

  await expect(async function () {
    await applySession(req, res, { cookieName });
  }).rejects.toThrowErrorMatchingInlineSnapshot(
    `"next-iron-session: Missing parameter \`password\`"`,
  );
});

test("applySession(req, res, {password})", async () => {
  const req = {};
  const res = {};

  await expect(async function () {
    await applySession(req, res, { password });
  }).rejects.toThrowErrorMatchingInlineSnapshot(
    `"next-iron-session: Missing parameter \`cookieName\`"`,
  );
});

test("ironSession({cookieName})", () => {
  expect(function () {
    ironSession({ cookieName });
  }).toThrowErrorMatchingInlineSnapshot(
    `"next-iron-session: Missing parameter \`password\`"`,
  );
});

test("ironSession({password})", () => {
  expect(function () {
    ironSession({ password });
  }).toThrowErrorMatchingInlineSnapshot(
    `"next-iron-session: Missing parameter \`cookieName\`"`,
  );
});

test("it throws when cookie length is too big", () => {
  return new Promise((done) => {
    const handler = async (req) => {
      req.session.set("user", "somevalue".repeat(500));
      await expect(async function () {
        await req.session.save();
      }).rejects.toThrowErrorMatchingInlineSnapshot(
        `"next-iron-session: Cookie length is too big 6341, browsers will refuse it"`,
      );
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, cookieName });
    wrappedHandler(
      {
        headers: { cookie: "" },
      },
      {
        setHeader: jest.fn(),
      },
    );
  });
});

test("it handles previously set cookies (single value)", () => {
  return new Promise((done) => {
    const handler = async (req, res) => {
      await req.session.save();

      const headerValue = res.setHeader.mock.calls[0][1];
      expect(headerValue.length).toBe(2);
      expect(headerValue[0]).toBe("existingCookie=value");
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, cookieName });
    wrappedHandler(
      {
        headers: { cookie: "" },
      },
      {
        setHeader: jest.fn(),
        getHeader: function () {
          return "existingCookie=value";
        },
      },
    );
  });
});

test("it handles previously set cookies (multiple values)", () => {
  return new Promise((done) => {
    const handler = async (req, res) => {
      await req.session.save();

      const headerValue = res.setHeader.mock.calls[0][1];
      expect(headerValue.length).toBe(3);
      expect(headerValue[0]).toBe("existingCookie=value");
      expect(headerValue[1]).toBe("anotherCookie=value2");
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, cookieName });
    wrappedHandler(
      {
        headers: { cookie: "" },
      },
      {
        setHeader: jest.fn(),
        getHeader: function () {
          return ["existingCookie=value", "anotherCookie=value2"];
        },
      },
    );
  });
});
