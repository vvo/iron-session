import {
  createSession,
  getSession,
  parseCookie,
  deleteCookie
} from "./index.js";
import Iron from "@hapi/iron";
import { advanceTo, clear } from "jest-date-mock";

const password = "Gbm49ATjnqnkCCCdhV4uDBhbfnPqsCW0";

test("it creates sessions", async () => {
  const session = await createSession({ password });
  session.set({ name: "userId", value: 12 });
  expect(session.get({ name: "userId" })).toBe(12);
  const cookie = await session.serializeCookie();
  expect(typeof cookie).toBe("string");
  expect(cookie.length).toBe(346); // we can't test the actual value are there's a good amount of random crypto in it
});

test("it reads sessions", async () => {
  // this was created in console with a ttl of 0 (never expires)
  const firstSession = await createSession({ password });
  firstSession.set({ name: "user", value: { id: 230, admin: true } });
  const cookie = await firstSession.serializeCookie();
  const secondSession = await getSession({
    sealed: parseCookie({ cookie }),
    password
  });
  expect(secondSession.get()).toMatchInlineSnapshot(`
    Object {
      "user": Object {
        "admin": true,
        "id": 230,
      },
    }
  `);
});

test("it throws when ttl reached (with a 60s difference allowance, set by Iron)", async () => {
  advanceTo(100);
  const sealed = await Iron.seal(
    { persistent: { userId: 400, admin: false } },
    password,
    {
      ...Iron.defaults,
      ttl: 120 * 1000
    }
  );
  advanceTo(140 * 1000); // still within the 120 + 60 seconds allowance
  expect((await getSession({ sealed, password })).get()).toMatchInlineSnapshot(`
    Object {
      "admin": false,
      "userId": 400,
    }
  `);
  advanceTo(190 * 1000); // above the 120 + 60 seconds allowance
  await expect(
    getSession({ sealed, password })
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"Expired seal"`);
  clear();
});

test("cookie headers are well set", async () => {
  const session = await createSession({ password });
  session.set({ name: "userId", value: 900 });
  const cookie = await session.serializeCookie();
  const cookieValues = cookie.split(";");
  cookieValues.shift(); // first element is the token

  expect(cookieValues.join(";")).toMatchInlineSnapshot(
    `" Max-Age=1295940; HttpOnly; Secure; SameSite=Lax"`
  );
});

test("Data is cloned on set", async () => {
  const session = await createSession({ password });
  const user = { id: 1200, admin: true };
  session.set({ name: "user", value: user });
  expect(session.get()).toMatchInlineSnapshot(`
Object {
  "user": Object {
    "admin": true,
    "id": 1200,
  },
}
`);
  user.id = 2200;
  expect(session.get()).toMatchInlineSnapshot(`
Object {
  "user": Object {
    "admin": true,
    "id": 1200,
  },
}
`);
});

test("Data is cloned on get", async () => {
  const session = await createSession({ password });
  const user = { id: 1700, admin: true };
  session.set({ name: "user", value: user });
  const sessionUser = session.get({ name: "user" });
  sessionUser.id = 3400;
  expect(session.get()).toMatchInlineSnapshot(`
Object {
  "user": Object {
    "admin": true,
    "id": 1700,
  },
}
`);
});

test("Flash data gets deleted when read", async () => {
  const firstSession = await createSession({ password });
  firstSession.set({ name: "state", value: "yes", flash: true });
  const firstCookie = await firstSession.serializeCookie();
  const secondSession = await getSession({
    sealed: parseCookie({ cookie: firstCookie }),
    password
  });
  expect(secondSession.get({ name: "state" })).toMatchInlineSnapshot(`"yes"`);
  const secondCookie = await secondSession.serializeCookie();
  const thirdSession = await getSession({
    sealed: parseCookie({ cookie: secondCookie }),
    password
  });
  expect(thirdSession.get({ name: "state" })).toMatchInlineSnapshot(
    `undefined`
  );
});

test("serializeCookie accepts options", async () => {
  const session = await createSession({ password });
  session.set({ name: "userId", value: 4320 });
  const cookie = await session.serializeCookie({ secure: false });
  const cookieValues = cookie.split(";");
  cookieValues.shift(); // first element is the token

  expect(cookieValues.join(";")).toMatchInlineSnapshot(
    `" Max-Age=1295940; HttpOnly; SameSite=Lax"`
  );
});

test("deleteCookie creates a cookie to expire immediately", () => {
  expect(deleteCookie()).toMatchInlineSnapshot(`"__ironSession=; Max-Age=0"`);
});

test("ttl = 0 sets a maximum maxAge directive (see https://stackoverflow.com/a/22479460/147079)", async () => {
  const session = await createSession({ password, ttl: 0 });
  session.set({ name: "userId", value: 4320 });
  const cookie = await session.serializeCookie({ secure: false });
  const cookieValues = cookie.split(";");
  cookieValues.shift(); // first element is the token

  expect(cookieValues.join(";")).toMatchInlineSnapshot(
    `" Max-Age=2147483587; HttpOnly; SameSite=Lax"`
  );
});
