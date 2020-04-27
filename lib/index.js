import ironStore from "iron-store";
import cookie from "cookie";

// TODO: warn on no session usage
// TODO: warn when session saved after end
// TODO: warn when session not saved after set and req ended

// default time allowed to check for iron seal validity when ttl passed
// see https://hapi.dev/family/iron/api/?v=6.0.0#options
const timestampSkewSec = 60;

function throwOnNoPassword() {
  throw new Error("next-iron-session: Missing parameter `password`");
}

function computeCookieMaxAge(ttl) {
  // The next line makes sure browser will expire cookies before seals are considered expired by the server.
  // It also allows for clock difference of 60 seconds maximum between server and clients.
  return (ttl === 0 ? 2147483647 : ttl) - timestampSkewSec;
}

const defaultCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
};

export default function withIronSession(
  withIronSessionWrapperHandler,
  {
    ttl = 15 * 24 * 3600,
    cookieName = "__ironSession",
    password = throwOnNoPassword(),
    cookieOptions: userCookieOptions = {},
  } = {},
) {
  const cookieOptions = {
    ...defaultCookieOptions,
    ...userCookieOptions,
    maxAge: userCookieOptions.maxAge || computeCookieMaxAge(ttl),
  };

  return async function withIronSessionHandler(...args) {
    const handlerType = args[0] && args[1] ? "api" : "ssr";
    const req = handlerType === "api" ? args[0] : args[0].req;
    const res = handlerType === "api" ? args[1] : args[0].res;

    const store = await getOrCreateStore({
      sealed: cookie.parse(req.headers.cookie || "")[cookieName],
      password,
      ttl: ttl * 1000,
    });

    const session = {
      set: store.set,
      get: store.get,
      setFlash: store.setFlash,
      unset: store.unset,
      async save() {
        const seal = await store.seal();
        const cookieValue = cookie.serialize(cookieName, seal, cookieOptions);
        res.setHeader("set-cookie", [cookieValue]);
      },
      destroy() {
        store.clear();
        const cookieValue = cookie.serialize(cookieName, "", {
          ...cookieOptions,
          maxAge: 0,
        });
        res.setHeader("set-cookie", [cookieValue]);
      },
    };

    req.session = session;

    return withIronSessionWrapperHandler(...args);
  };
}

async function getOrCreateStore({ sealed, password, ttl }) {
  try {
    return await ironStore({
      sealed,
      password,
      ttl,
    });
  } catch (err) {
    if (err.message === "Expired seal") {
      // if seal expires and it somehow reaches our servers (seal was stolen, bad clock)
      // then we just start a new session over
      return ironStore({ password, ttl });
    }

    throw err;
  }
}
