import ironStore from "iron-store";
import cookie from "cookie";

// TODO: warn on no session usage
// TODO: warn when session saved after end
// TODO: warn when session not saved after set and req ended

// default time allowed to check for iron seal validity when ttl passed
// see https://hapi.dev/family/iron/api/?v=6.0.0#options
const timestampSkewSec = 60;

function throwOnNoPassword() {
  throw new Error("next-iron-sesion: Missing parameter `password`");
}

function computeCookieMaxAge(ttl) {
  return (ttl === 0 ? 2147483647 : ttl) - timestampSkewSec;
}

const defaultCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax"
};

export default function withIronSession(
  withIronSessionWrapperHandler,
  {
    ttl = 15 * 24 * 3600,
    cookieName = "__ironSession",
    password = throwOnNoPassword(),
    cookieOptions: userCookieOptions = {}
  } = {}
) {
  const cookieOptions = {
    ...defaultCookieOptions,
    ...userCookieOptions,
    maxAge: userCookieOptions.maxAge || computeCookieMaxAge(ttl)
  };

  return async function withIronSessionHandler(req, res) {
    const store = await ironStore({
      sealed: req.cookies[cookieName],
      password,
      ttl
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
        const cookieValue = cookie.serialize(cookieName, "", {
          maxAge: 0
        });
        res.setHeader("set-cookie", [cookieValue]);
      }
    };

    req.session = session;

    return withIronSessionWrapperHandler(req, res);
  };
}
