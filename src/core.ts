import type { IncomingMessage, ServerResponse } from "node:http";
import { parseCookie, stringifySetCookie, type SetCookie } from "cookie";
import { defaults as ironDefaults, seal as ironSeal, unseal as ironUnseal } from "iron-webcrypto";

type PasswordsMap = Record<string, string>;
type Password = PasswordsMap | string;
type RequestType = IncomingMessage | Request;
type ResponseType = Response | ServerResponse;

/**
 * {@link https://wicg.github.io/cookie-store/#dictdef-cookielistitem CookieListItem}
 * as specified by W3C.
 */
interface CookieListItem extends Pick<SetCookie, "domain" | "path" | "sameSite" | "secure"> {
  /** A string with the name of a cookie. */
  name: string;
  /** A string containing the value of the cookie. */
  value: string;
  /** A number of milliseconds or Date interface containing the expires of the cookie. */
  expires?: SetCookie["expires"] | number;
}

/**
 * Superset of {@link CookieListItem} extending it with
 * the `httpOnly`, `maxAge` and `priority` properties.
 */
type ResponseCookie = CookieListItem &
  Pick<SetCookie, "httpOnly" | "priority"> & {
    maxAge?: number | undefined;
  };

/**
 * The high-level type definition of the .get() and .set() methods
 * of { cookies() } from "next/headers"
 */
export interface CookieStore {
  get: (name: string) => { name: string; value: string } | undefined;
  set: {
    (name: string, value: string, cookie?: Partial<ResponseCookie>): void;
    (options: ResponseCookie): void;
  };
}

/**
 * Set-Cookie attributes. `name` and `value` are owned by iron-session
 * (`cookieName` and the seal), so they are not configurable here.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
 * @see https://developer.chrome.com/docs/devtools/application/cookies/
 */
type CookieOptions = Omit<SetCookie, "name" | "value" | "maxAge"> & {
  /**
   * Explicitly allows `undefined` so that `cookieOptions: { maxAge: undefined }`
   * keeps working under `exactOptionalPropertyTypes`. That is the documented way
   * to ask for a "session cookie" that the browser drops when it closes.
   */
  maxAge?: number | undefined;
};

export interface SessionOptions {
  /**
   * The cookie name that will be used inside the browser. Make sure it's unique
   * given your application.
   *
   * @example 'vercel-session'
   */
  cookieName: string;

  /**
   * The password(s) that will be used to encrypt the cookie. Can either be a string
   * or an object.
   *
   * When you provide multiple passwords then all of them will be used to decrypt
   * the cookie. But only the most recent (`= highest key`, `2` in the example)
   * password will be used to encrypt the cookie. This allows password rotation.
   *
   * @example { 1: 'password-1', 2: 'password-2' }
   */
  password: Password;

  /**
   * The time (in seconds) that the session will be valid for. Also sets the
   * `max-age` attribute of the cookie automatically (`= ttl - 60s`, so that the
   * cookie always expire before the session).
   *
   * `ttl = 0` means no expiration.
   *
   * @default 1209600
   */
  ttl?: number;

  /**
   * The options that will be passed to the cookie library.
   *
   * If you want to use "session cookies" (cookies that are deleted when the browser
   * is closed) then you need to pass `cookieOptions: { maxAge: undefined }`
   *
   * @see https://github.com/jshttp/cookie#options-1
   */
  cookieOptions?: CookieOptions;

  /**
   * Called when an existing cookie could not be read, right before the session
   * is reset to an empty object.
   *
   * A stateless session library cannot tell a tampered cookie from a badly
   * rotated password, so it always starts a new session rather than throwing.
   * That is the safe default, but it means genuine problems are invisible:
   * a `"unknown-password"` burst usually means a broken password rotation, and
   * an `"invalid"` burst can mean someone is probing your cookies. Log them.
   *
   * This hook must not throw. It is not a place to deny access: the session is
   * empty either way.
   *
   * @example
   * onUnsealError: (reason, error) => {
   *   if (reason !== "expired") logger.warn({ reason, error }, "session cookie rejected");
   * }
   */
  onUnsealError?: (reason: UnsealErrorReason, error: unknown) => void;
}

export type IronSession<T> = T & {
  /**
   * Encrypts the session data and sets the cookie.
   */
  readonly save: () => Promise<void>;

  /**
   * Destroys the session data and removes the cookie.
   */
  readonly destroy: () => void;

  /**
   * Update the session configuration. You still need to call save() to send the new cookie.
   */
  readonly updateConfig: (newSessionOptions: SessionOptions) => void;
};

// default time allowed to check for iron seal validity when ttl passed
// see https://hapi.dev/module/iron/api/?v=7.0.1#options
const timestampSkewSec = 60;
const fourteenDaysInSeconds = 14 * 24 * 3600;

// We store a token major version to handle data format changes so that the cookies
// can be kept alive between upgrades, no need to disconnect everyone.
const currentMajorVersion = 2;
const versionDelimiter = "~";

const defaultOptions: Required<Pick<SessionOptions, "ttl" | "cookieOptions">> = {
  ttl: fourteenDaysInSeconds,
  cookieOptions: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
};

function normalizeStringPasswordToMap(password: Password): PasswordsMap {
  return typeof password === "string" ? { 1: password } : password;
}

/**
 * Removes the trailing `~<version>` marker from a seal.
 *
 * The marker sits outside the seal's HMAC, so it is attacker-controlled and its
 * value must never select a code path. iron-session v8 used it to unwrap a
 * `persistent` key from v6-era cookies; v9 drops that format, so the marker is
 * now inert metadata that we strip and ignore.
 */
function stripVersion(seal: string): string {
  const delimiterIndex = seal.indexOf(versionDelimiter);
  return delimiterIndex === -1 ? seal : seal.slice(0, delimiterIndex);
}

function computeCookieMaxAge(ttl: number): number {
  if (ttl === 0) {
    // ttl = 0 means no expiration
    // but in reality cookies have to expire (can't have no max-age)
    // 2147483647 is the max value for max-age in cookies
    // see https://stackoverflow.com/a/11685301/147079
    return 2147483647;
  }

  // Expire the cookie slightly before the seal, and allow for a 60 second clock
  // difference between server and client. Clamped to 1: a short ttl used to
  // produce `Max-Age=0` or a negative value, which makes the browser drop the
  // cookie on arrival while save() still reported success.
  return Math.max(1, ttl - timestampSkewSec);
}

/**
 * Builds the `Set-Cookie` header value.
 *
 * `cookie@2` rejects an explicit `maxAge: undefined` under
 * `exactOptionalPropertyTypes`, and an absent `Max-Age` is exactly what
 * `maxAge: undefined` is meant to produce, so the key is dropped instead of
 * forwarded.
 */
function serializeCookie(
  name: string,
  value: string,
  { maxAge, ...cookieOptions }: CookieOptions,
): string {
  return stringifySetCookie({
    ...cookieOptions,
    ...(maxAge === undefined ? {} : { maxAge }),
    name,
    value,
  });
}

function getCookie(req: RequestType, cookieName: string): string {
  return (
    parseCookie(
      ("headers" in req && typeof req.headers.get === "function"
        ? req.headers.get("cookie")
        : (req as IncomingMessage).headers.cookie) ?? "",
    )[cookieName] ?? ""
  );
}

function getServerActionCookie(cookieName: string, cookieHandler: CookieStore): string {
  const cookieObject = cookieHandler.get(cookieName);
  const cookie = cookieObject?.value;
  if (typeof cookie === "string") {
    return cookie;
  }
  return "";
}

function setCookie(res: ResponseType, cookieValue: string): void {
  if ("headers" in res && typeof res.headers.append === "function") {
    res.headers.append("set-cookie", cookieValue);
    return;
  }
  let existingSetCookie = (res as ServerResponse).getHeader("set-cookie") ?? [];
  if (!Array.isArray(existingSetCookie)) {
    existingSetCookie = [existingSetCookie.toString()];
  }
  (res as ServerResponse).setHeader("set-cookie", [...existingSetCookie, cookieValue]);
}

export async function sealData(
  data: unknown,
  { password, ttl = fourteenDaysInSeconds }: { password: Password; ttl?: number },
): Promise<string> {
  const passwordsMap = normalizeStringPasswordToMap(password);

  const mostRecentPasswordId = Math.max(...Object.keys(passwordsMap).map(Number));
  const secret = passwordsMap[mostRecentPasswordId];

  if (secret === undefined) {
    throw new Error(
      "iron-session: Bad usage. The password map has no usable entry, it must be a non-empty object keyed by numbers, for example { 1: 'your-password' }.",
    );
  }

  const passwordForSeal = { id: mostRecentPasswordId.toString(), secret };

  let seal: string;
  try {
    // Spread into a plain object: iron-webcrypto v2 refuses to encode the
    // non-enumerable save/destroy/updateConfig properties we define on sessions.
    seal = await ironSeal(
      data !== null && typeof data === "object" ? { ...data } : data,
      passwordForSeal,
      { ...ironDefaults, ttl: ttl * 1000 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Data is not JSON serializable") {
      throw new Error(
        "iron-session: The session data is not JSON serializable. Store plain JSON values only: a Date must be stored as a timestamp (Date.now()) or an ISO string, and Map/Set/BigInt/undefined/functions are not supported.",
        { cause: error },
      );
    }
    throw error;
  }

  return `${seal}${versionDelimiter}${currentMajorVersion}`;
}

/**
 * Why an existing cookie could not be read. Every reason results in a fresh,
 * empty session: a session library cannot tell a tampered cookie from a
 * badly rotated password, so the only safe outcome is to start over.
 * Use `onUnsealError` to observe these, they are otherwise invisible.
 */
export type UnsealErrorReason =
  /** The seal is past its expiration. Normal, this is how sessions end. */
  | "expired"
  /** Integrity check failed, or the value is not a seal at all. Possible tampering. */
  | "invalid"
  /** The seal references a password id that is not in the password map. Usually a rotation mistake. */
  | "unknown-password";

function classifyUnsealError(error: unknown): UnsealErrorReason {
  if (!(error instanceof Error)) return "invalid";
  if (error.message.startsWith("Expired seal")) return "expired";
  if (error.message.startsWith("Cannot find password")) return "unknown-password";
  // Everything else means "this string is not a seal we can read": bad hmac,
  // wrong mac prefix, invalid expiration, wrong component count, bad base64.
  // We deliberately do not enumerate iron-webcrypto's messages here: an
  // unrecognised failure must still reset the session rather than throw a 500
  // on every request from a browser holding a poisoned cookie.
  return "invalid";
}

export async function unsealData<T>(
  seal: string,
  {
    password,
    ttl = fourteenDaysInSeconds,
    onUnsealError,
  }: {
    password: Password;
    ttl?: number;
    onUnsealError?: (reason: UnsealErrorReason, error: unknown) => void;
  },
): Promise<T> {
  const passwordsMap = normalizeStringPasswordToMap(password);
  const sealWithoutVersion = stripVersion(seal);

  try {
    const data =
      (await ironUnseal(sealWithoutVersion, passwordsMap, {
        ...ironDefaults,
        ttl: ttl * 1000,
      })) ?? {};

    return data as T;
  } catch (error) {
    onUnsealError?.(classifyUnsealError(error), error);
    return {} as T;
  }
}

/** The options that actually shape the cookie, with defaults applied. */
type SessionConfig = Required<
  Pick<SessionOptions, "cookieName" | "password" | "ttl" | "cookieOptions">
>;

function getSessionConfig(sessionOptions: SessionOptions): SessionConfig {
  const options = {
    ...defaultOptions,
    ...sessionOptions,
    cookieOptions: {
      ...defaultOptions.cookieOptions,
      ...sessionOptions.cookieOptions,
    },
  };

  if (sessionOptions.cookieOptions && "maxAge" in sessionOptions.cookieOptions) {
    if (sessionOptions.cookieOptions.maxAge === undefined) {
      // session cookies, do not set maxAge, consider token as infinite
      options.ttl = 0;
    }
  } else {
    options.cookieOptions.maxAge = computeCookieMaxAge(options.ttl);
  }

  return options;
}

const badUsageMessage =
  "iron-session: Bad usage: use getIronSession(req, res, options) or getIronSession(cookieStore, options).";

export async function getIronSession<T extends object>(
  cookies: CookieStore,
  sessionOptions: SessionOptions,
): Promise<IronSession<T>>;
export async function getIronSession<T extends object>(
  req: RequestType,
  res: ResponseType,
  sessionOptions: SessionOptions,
): Promise<IronSession<T>>;
export async function getIronSession<T extends object>(
  reqOrCookieStore: RequestType | CookieStore,
  resOrsessionOptions: ResponseType | SessionOptions,
  sessionOptions?: SessionOptions,
): Promise<IronSession<T>> {
  {
    if (!reqOrCookieStore) {
      throw new Error(badUsageMessage);
    }

    if (!resOrsessionOptions) {
      throw new Error(badUsageMessage);
    }

    if (!sessionOptions) {
      return getIronSessionFromCookieStore<T>(
        reqOrCookieStore as CookieStore,
        resOrsessionOptions as SessionOptions,
      );
    }

    const req = reqOrCookieStore as RequestType;
    const res = resOrsessionOptions as ResponseType;

    if (!sessionOptions.cookieName) {
      throw new Error("iron-session: Bad usage. Missing cookie name.");
    }

    if (!sessionOptions.password) {
      throw new Error("iron-session: Bad usage. Missing password.");
    }

    const passwordsMap = normalizeStringPasswordToMap(sessionOptions.password);

    if (Object.values(passwordsMap).some((password) => password.length < 32)) {
      throw new Error("iron-session: Bad usage. Password must be at least 32 characters long.");
    }

    let sessionConfig = getSessionConfig(sessionOptions);

    const sealFromCookies = getCookie(req, sessionConfig.cookieName);
    const session = sealFromCookies
      ? await unsealData<T>(sealFromCookies, {
          password: passwordsMap,
          ttl: sessionConfig.ttl,
          ...(sessionOptions.onUnsealError ? { onUnsealError: sessionOptions.onUnsealError } : {}),
        })
      : ({} as T);

    Object.defineProperties(session, {
      updateConfig: {
        value: function updateConfig(newSessionOptions: SessionOptions) {
          sessionConfig = getSessionConfig(newSessionOptions);
        },
      },
      save: {
        value: async function save() {
          if ("headersSent" in res && res.headersSent) {
            throw new Error(
              "iron-session: Cannot set session cookie: session.save() was called after headers were sent. Make sure to call it before any res.send() or res.end()",
            );
          }

          const seal = await sealData(session, {
            password: passwordsMap,
            ttl: sessionConfig.ttl,
          });
          const cookieValue = serializeCookie(
            sessionConfig.cookieName,
            seal,
            sessionConfig.cookieOptions,
          );

          if (cookieValue.length > 4096) {
            throw new Error(
              `iron-session: Cookie length is too big (${cookieValue.length} bytes), browsers will refuse it. Try to remove some data.`,
            );
          }

          setCookie(res, cookieValue);
        },
      },

      destroy: {
        value: function destroy() {
          Object.keys(session).forEach((key) => {
            delete (session as Record<string, unknown>)[key];
          });
          const cookieValue = serializeCookie(sessionConfig.cookieName, "", {
            ...sessionConfig.cookieOptions,
            maxAge: 0,
          });

          setCookie(res, cookieValue);
        },
      },
    });

    return session as IronSession<T>;
  }
}

async function getIronSessionFromCookieStore<T extends object>(
  cookieStore: CookieStore,
  sessionOptions: SessionOptions,
): Promise<IronSession<T>> {
  if (!sessionOptions.cookieName) {
    throw new Error("iron-session: Bad usage. Missing cookie name.");
  }

  if (!sessionOptions.password) {
    throw new Error("iron-session: Bad usage. Missing password.");
  }

  const passwordsMap = normalizeStringPasswordToMap(sessionOptions.password);

  if (Object.values(passwordsMap).some((password) => password.length < 32)) {
    throw new Error("iron-session: Bad usage. Password must be at least 32 characters long.");
  }

  let sessionConfig = getSessionConfig(sessionOptions);
  const sealFromCookies = getServerActionCookie(sessionConfig.cookieName, cookieStore);
  const session = sealFromCookies
    ? await unsealData<T>(sealFromCookies, {
        password: passwordsMap,
        ttl: sessionConfig.ttl,
        ...(sessionOptions.onUnsealError ? { onUnsealError: sessionOptions.onUnsealError } : {}),
      })
    : ({} as T);

  Object.defineProperties(session, {
    updateConfig: {
      value: function updateConfig(newSessionOptions: SessionOptions) {
        sessionConfig = getSessionConfig(newSessionOptions);
      },
    },
    save: {
      value: async function save() {
        const seal = await sealData(session, {
          password: passwordsMap,
          ttl: sessionConfig.ttl,
        });

        const cookieLength =
          sessionConfig.cookieName.length +
          seal.length +
          JSON.stringify(sessionConfig.cookieOptions).length;

        if (cookieLength > 4096) {
          throw new Error(
            `iron-session: Cookie length is too big (${cookieLength} bytes), browsers will refuse it. Try to remove some data.`,
          );
        }

        cookieStore.set(sessionConfig.cookieName, seal, sessionConfig.cookieOptions);
      },
    },

    destroy: {
      value: function destroy() {
        Object.keys(session).forEach((key) => {
          delete (session as Record<string, unknown>)[key];
        });

        const cookieOptions = { ...sessionConfig.cookieOptions, maxAge: 0 };
        cookieStore.set(sessionConfig.cookieName, "", cookieOptions);
      },
    },
  });

  return session as IronSession<T>;
}
