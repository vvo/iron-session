import withIronSession from "./index.js";

const password = "Gbm49ATjnqnkCCCdhV4uDBhbfnPqsCW0";

test("ironStore(handler) without a password", () => {
  return new Promise(done => {
    const handler = () => {};
    expect(() => {
      withIronSession(handler);
    }).toThrowErrorMatchingInlineSnapshot(
      `"next-iron-sesion: Missing parameter \`password\`"`
    );
    done();
  });
});

test("ironStore(handler, {password})", () => {
  return new Promise(done => {
    const handler = req => {
      expect(req.session).toMatchInlineSnapshot(`
        Object {
          "destroy": [Function],
          "get": [Function],
          "save": [Function],
          "set": [Function],
          "setFlash": [Function],
        }
      `);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password });
    wrappedHandler(
      {
        cookies: {}
      },
      {}
    );
  });
});

test("req.session.set", () => {
  return new Promise(done => {
    const handler = req => {
      expect(req.session.set("user", { id: 20 })).toMatchInlineSnapshot(`
        Object {
          "id": 20,
        }
      `);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password });
    wrappedHandler(
      {
        cookies: {}
      },
      {}
    );
  });
});

test("req.session.setFlash", () => {
  return new Promise(done => {
    const handler = req => {
      req.session.setFlash("state", "dfsafsalfk21lkf12lkf21");
      expect(req.session.get("state")).toMatchInlineSnapshot(
        `"dfsafsalfk21lkf12lkf21"`
      );
      expect(req.session.get("state")).toMatchInlineSnapshot(`undefined`);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password });
    wrappedHandler(
      {
        cookies: {}
      },
      {}
    );
  });
});

test("req.session.save creates a seal and stores it in a cookie", () => {
  return new Promise(done => {
    const handler = async (req, res) => {
      await req.session.save();
      const headerName = res.setHeader.mock.calls[0][0];
      expect(headerName).toMatchInlineSnapshot(`"set-cookie"`);

      const headerValue = res.setHeader.mock.calls[0][1];
      expect(Array.isArray(headerValue)).toBe(true);
      expect(headerValue).toHaveLength(1);

      const cookie = headerValue[0];
      const seal = cookie.split(";")[0].split("=")[1];
      expect(seal).toHaveLength(262);

      const cookieParams = cookie
        .split(";")
        .slice(1)
        .join(";");
      expect(cookieParams).toMatchInlineSnapshot(
        `" Max-Age=1295940; HttpOnly; Secure; SameSite=Lax"`
      );
      done();
    };
    const wrappedHandler = withIronSession(handler, { password });
    wrappedHandler(
      {
        cookies: {}
      },
      {
        setHeader: jest.fn()
      }
    );
  });
});

test("ironStore(handler, {password}) with existing session", async () => {
  return new Promise(done => {
    const handler = req => {
      expect(req.session.get()).toMatchInlineSnapshot(`
Object {
  "user": Object {
    "id": 3,
  },
}
`);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password });
    wrappedHandler(
      {
        cookies: {
          __ironSession:
            "Fe26.2**4e769b9b7b921621ed5658cfc0d7d8e267dc8ee93663c2803c257b31111394e3*jRXOJHmt_BDG9nNTXcVRXQ*UHpK9GYp7SXTiEsxTzTUq_tQD_-ZUp7PguEXy-bRFuBE4fW74-9wm9UtlWO2rlwB**d504d6d197d183efec0ae6d3c2378c43048c8752d6c3c591c92289ed01142b3c*3NG2fCo8A53CXPU8rEAMnDB7X9UkwzTaHieumPBqyTw"
        }
      },
      {}
    );
  });
});

test("When ttl is 0, maxAge have a specific value", () => {
  return new Promise(done => {
    const handler = async (req, res) => {
      await req.session.save();
      const headerValue = res.setHeader.mock.calls[0][1];
      const cookie = headerValue[0];
      const maxAgeParam = cookie.split(";")[1];
      expect(maxAgeParam).toMatchInlineSnapshot(`" Max-Age=2147483587"`);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, ttl: 0 });
    wrappedHandler(
      {
        cookies: {}
      },
      {
        setHeader: jest.fn()
      }
    );
  });
});

test("req.session.destroy", () => {
  return new Promise(done => {
    const handler = async (req, res) => {
      req.session.destroy();
      expect(res.setHeader.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  "set-cookie",
  Array [
    "__ironSession=; Max-Age=0",
  ],
]
`);
      done();
    };
    const wrappedHandler = withIronSession(handler, { password, ttl: 0 });
    wrappedHandler(
      {
        cookies: { coucou: true }
      },
      {
        setHeader: jest.fn()
      }
    );
  });
});
