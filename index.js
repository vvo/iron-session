import Iron from "@hapi/iron";
import cookie from "cookie";
import clone from "clone";

const defaultTtl = 15 * 24 * 3600;
const cookieName = "__ironSession";

export async function createSession({ password, ttl = defaultTtl }) {
  return getSession({ password, ttl });
}

export async function getSession({ sealed, password, ttl = defaultTtl }) {
  const options = { ...Iron.defaults, ttl };
  const store =
    sealed !== undefined
      ? await Iron.unseal(sealed, password, options)
      : { persistent: {}, flash: {} };

  return {
    set({ name, value, flash = false }) {
      if (flash === true) {
        store.flash[name] = clone(value);
      } else {
        store.persistent[name] = clone(value);
      }
    },
    get({ name = undefined } = {}) {
      if (name === undefined) {
        const flash = store.flash;
        store.flash = {};
        return clone({
          ...flash,
          ...store.persistent
        });
      }

      if (store.flash[name] !== undefined) {
        const value = store.flash[name];
        delete store.flash[name];
        return value; // no need to clone, we removed the reference from the flash store
      } else {
        return clone(store.persistent[name]);
      }
    },
    async serializeCookie(cookieOptions = {}) {
      return cookie.serialize(
        cookieName,
        await Iron.seal(store, password, options),
        {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: (ttl === 0 ? 2147483647 : ttl) - 60, // For Iron, ttl 0 means it will never expire. For browser cookies, maxAge 0 means it will expire immediately. WhilCookie must expire before the seal, otherwise you could have expired seals stored in a cookie
          ...cookieOptions
        }
      );
    }
  };
}

export function parseCookie({ cookie: cookieValue }) {
  return cookie.parse(cookieValue)[cookieName];
}

export function deleteCookie() {
  return cookie.serialize(cookieName, "", {
    maxAge: 0
  });
}
