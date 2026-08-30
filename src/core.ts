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
 * What iron-session needs from a cookie store. This is deliberately the shape
 * of `await cookies()` from `next/headers`, so it can be passed in directly.
 *
 * `getAll` is optional: it is only used to find cookie chunks, and stores that
 * cannot enumerate are probed by name instead.
 */
export interface CookieStore {
  get: (name: string) => { name: string; value: string } | undefined;
  getAll?: () => { name: string; value: string }[];
  /**
   * One signature with a required third argument, returning `unknown`.
   *
   * Every part of that matters for `getIronSession(await cookies(), ...)` to
   * typecheck against Next.js, which is what #840 was about:
   *
   * - not an overload pair. Next declares a single signature over a tuple
   *   union, and a single signature is not assignable to an overload pair.
   * - the third argument is required, not optional. Next's tuple element is
   *   `cookie?: Partial<ResponseCookie>`, and under
   *   `exactOptionalPropertyTypes` our optional parameter widened to
   *   `Partial<ResponseCookie> | undefined`, which their tuple rejects. We
   *   always pass cookie options anyway.
   * - `unknown` return. Next returns the cookie store itself, not void.
   */
  set: (name: string, value: string, cookie: Partial<ResponseCookie>) => unknown;
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
   * `ttl = 0` means no expiration. Do not use it for authentication: the seal
   * is then accepted forever and there is no way to revoke it.
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

  /**
   * Split a session that does not fit in one cookie across several cookies,
   * named `<cookieName>.0`, `<cookieName>.1` and so on.
   *
   * Off by default, and reading works either way: turning this on or off does
   * not sign anyone out.
   *
   * Read the size limits before reaching for this. A browser caps one cookie at
   * 4096 bytes, but the real constraint is the request side: every cookie is
   * sent on every request, and proxies cap the whole `Cookie` header well below
   * what four chunks can produce. nginx allows 8 KB by default, and a CDN or
   * load balancer in front of it may allow less. Going over that returns 400 or
   * 431 at the edge, before your app runs, which is much harder to debug than
   * an error from us. iron-session refuses more than {@link MAX_CHUNKS} chunks
   * for that reason.
   *
   * Chunking is an escape hatch for a session slightly over the limit. If you
   * need a lot of room, store an id in the session and keep the data in your
   * database.
   *
   * @default false
   */
  chunk?: boolean;
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

const defaultOptions: Required<Pick<SessionOptions, "ttl" | "cookieOptions" | "chunk">> = {
  ttl: fourteenDaysInSeconds,
  cookieOptions: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  chunk: false,
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

/**
 * The one thing iron-session needs from a runtime: read a cookie by name, and
 * write a cookie back. Everything else (Node req/res, web Request/Response,
 * Next's `cookies()`, Next's proxy) is an adapter that produces one of these.
 *
 * There used to be two copies of the read/save/destroy logic, one per calling
 * convention, and they drifted: the cookie size limit was computed differently
 * in each, and only one of them checked whether it was still possible to send a
 * header. Everything now goes through a single implementation.
 */
export interface CookieJar {
  read: (name: string) => string | undefined;
  write: (name: string, value: string, options: CookieOptions) => void;
  /**
   * Names of the cookies present on the request, when the runtime can list
   * them. Used to find cookie chunks.
   */
  names?: () => string[];
  /**
   * Throws if a cookie can no longer be sent, for runtimes where writing after
   * a certain point is silently dropped. Losing a session cookie without an
   * error is much worse than a loud failure.
   */
  assertWritable?: () => void;
}

function isWebRequest(req: RequestType): req is Request {
  return "headers" in req && typeof (req as Request).headers.get === "function";
}

function readCookieHeader(req: RequestType, name: string): string | undefined {
  const header = isWebRequest(req) ? req.headers.get("cookie") : req.headers.cookie;
  return parseCookie(header ?? "")[name];
}

function cookieHeaderNames(req: RequestType): string[] {
  const header = isWebRequest(req) ? req.headers.get("cookie") : req.headers.cookie;
  return Object.keys(parseCookie(header ?? ""));
}

/**
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

/**
 * Node's `http` server, which is also Express, Connect and Next.js API routes.
 *
 * @example
 * const session = await getIronSession(nodeCookies(req, res), options);
 */
export function nodeCookies(req: IncomingMessage, res: ServerResponse): CookieJar {
  return {
    read: (name) => readCookieHeader(req, name),
    names: () => cookieHeaderNames(req),
    assertWritable: () => {
      if (res.headersSent) {
        throw new Error(
          "iron-session: Cannot set session cookie: session.save() was called after headers were sent. Make sure to call it before any res.send() or res.end()",
        );
      }
    },
    write: (name, value, options) => {
      const existing = res.getHeader("set-cookie") ?? [];
      const previous = Array.isArray(existing) ? existing : [existing.toString()];
      res.setHeader("set-cookie", [...previous, serializeCookie(name, value, options)]);
    },
  };
}

/**
 * Web-standard `Request` plus anything with appendable headers: a `Response`,
 * a bare `Headers`, or Next's `NextResponse`.
 *
 * @example
 * const headers = new Headers();
 * const session = await getIronSession(webCookies(request, headers), options);
 * return new Response(body, { headers });
 */
export function webCookies(request: Request, response: Response | Headers): CookieJar {
  const headers = response instanceof Headers ? response : response.headers;

  return {
    read: (name) => readCookieHeader(request, name),
    names: () => cookieHeaderNames(request),
    assertWritable: () => {
      // A Response the runtime has already started sending ignores header
      // mutations without complaining, which loses the session silently.
      if (response instanceof Response && response.bodyUsed) {
        throw new Error(
          "iron-session: Cannot set session cookie: the response body has already been consumed, so the Set-Cookie header would be dropped. Call session.save() before returning or streaming the response.",
        );
      }
    },
    write: (name, value, options) => {
      headers.append("set-cookie", serializeCookie(name, value, options));
    },
  };
}

/**
 * The parts of `NextRequest`/`NextResponse` we touch, structurally typed so
 * `next` is not a dependency.
 *
 * Request and response cookies are not the same type in Next: request cookies
 * take `(name, value)` only, because attributes are meaningless on an incoming
 * cookie, while response cookies take `(name, value, options)`. Declaring one
 * shared interface for both is what made `NextRequest` fail to assign.
 */
interface NextRequestCookies {
  get: (name: string) => { name: string; value: string } | undefined;
  getAll?: () => { name: string; value: string }[];
  set: (name: string, value: string) => unknown;
}

interface NextResponseCookies {
  set: (name: string, value: string, options: Partial<ResponseCookie>) => unknown;
}

/**
 * Next.js `proxy.ts` (called `middleware.ts` before Next 16).
 *
 * Writing a raw `set-cookie` header here does not work the way you would
 * expect: Next only merges a cookie into the current render when it goes
 * through `response.cookies.set()`, so `session.save()` in middleware appeared
 * to succeed and then vanished. Writing to `request.cookies` as well makes the
 * new value visible to code that reads the session later in the same request,
 * which is what makes rotation work.
 *
 * @example
 * export async function proxy(request: NextRequest) {
 *   const response = NextResponse.next();
 *   const session = await getIronSession(nextProxyCookies(request, response), options);
 *   session.lastSeen = Date.now();
 *   await session.save();
 *   return response;
 * }
 */
export function nextProxyCookies(
  request: { cookies: NextRequestCookies },
  response: { cookies: NextResponseCookies },
): CookieJar {
  return {
    read: (name) => request.cookies.get(name)?.value,
    names: () => request.cookies.getAll?.().map((cookie) => cookie.name) ?? [],
    write: (name, value, options) => {
      // The response carries the cookie to the browser.
      response.cookies.set(name, value, options);
      // The request makes it visible to the rest of this same request.
      // No attributes here on purpose, they mean nothing on an incoming cookie
      // and Next's request cookies only accept a name and a value.
      request.cookies.set(name, value);
    },
  };
}

/** Wraps a `cookies()`-style store (Next's App Router) in a jar. */
function cookieStoreJar(cookieStore: CookieStore): CookieJar {
  return {
    read: (name) => cookieStore.get(name)?.value,
    names: () => cookieStore.getAll?.().map((cookie) => cookie.name) ?? [],
    write: (name, value, options) => {
      cookieStore.set(name, value, options);
    },
  };
}

function isCookieJar(value: unknown): value is CookieJar {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CookieJar).read === "function" &&
    typeof (value as CookieJar).write === "function"
  );
}

function isCookieStore(value: unknown): value is CookieStore {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CookieStore).get === "function" &&
    typeof (value as CookieStore).set === "function"
  );
}

/** The options that actually shape the cookie, with defaults applied. */
type SessionConfig = Required<
  Pick<SessionOptions, "cookieName" | "password" | "ttl" | "cookieOptions" | "chunk">
> & {
  passwordsMap: PasswordsMap;
};

function getSessionConfig(sessionOptions: SessionOptions): SessionConfig {
  if (!sessionOptions.cookieName) {
    throw new Error("iron-session: Bad usage. Missing cookie name.");
  }

  if (!sessionOptions.password) {
    throw new Error("iron-session: Bad usage. Missing password.");
  }

  const passwordsMap = normalizeStringPasswordToMap(sessionOptions.password);

  if (Object.keys(passwordsMap).length === 0) {
    throw new Error(
      "iron-session: Bad usage. The password map is empty, it must be keyed by numbers, for example { 1: 'your-password' }.",
    );
  }

  for (const [id, password] of Object.entries(passwordsMap)) {
    if (!Number.isInteger(Number(id))) {
      throw new Error(
        `iron-session: Bad usage. Password ids must be integers, got ${JSON.stringify(id)}. Use { 1: '...', 2: '...' }.`,
      );
    }
    if (typeof password !== "string" || password.length < 32) {
      throw new Error("iron-session: Bad usage. Password must be at least 32 characters long.");
    }
  }

  const options = {
    ...defaultOptions,
    ...sessionOptions,
    passwordsMap,
    cookieOptions: { ...defaultOptions.cookieOptions, ...sessionOptions.cookieOptions },
  };

  if (sessionOptions.cookieOptions && "maxAge" in sessionOptions.cookieOptions) {
    if (sessionOptions.cookieOptions.maxAge === undefined) {
      // session cookies, do not set maxAge, consider token as infinite
      options.ttl = 0;
    }
  } else {
    options.cookieOptions.maxAge = computeCookieMaxAge(options.ttl);
  }

  const { expires } = options.cookieOptions;
  if (expires instanceof Date && expires.getTime() < Date.now()) {
    throw new Error(
      `iron-session: Bad usage. cookieOptions.expires is in the past (${expires.toISOString()}), so the browser will discard the cookie and the session will never persist. This usually means the Date was created once at module scope. Use \`ttl\` instead.`,
    );
  }

  return options;
}

/**
 * The single session implementation. Reads the cookie through the jar, and
 * defines save/destroy/updateConfig against that same jar.
 */
async function createSession<T extends object>(
  jar: CookieJar,
  sessionOptions: SessionOptions,
): Promise<IronSession<T>> {
  let config = getSessionConfig(sessionOptions);
  let onUnsealError = sessionOptions.onUnsealError;

  const sealFromCookies = readSeal(jar, config.cookieName);
  const session = sealFromCookies
    ? await unsealData<T>(sealFromCookies, {
        password: config.passwordsMap,
        ttl: config.ttl,
        ...(onUnsealError ? { onUnsealError } : {}),
      })
    : ({} as T);

  // `destroy()` used to only clear the object and queue an expired cookie, so a
  // later `save()` re-sealed the same session and the last Set-Cookie won. A
  // wrapper that refreshed a rolling expiry at end of request silently
  // cancelled every logout in the app.
  let destroyed = false;

  Object.defineProperties(session, {
    updateConfig: {
      value: function updateConfig(newSessionOptions: SessionOptions) {
        // Rebuilt in full, including the password map. It used to only refresh
        // the cookie options, so passing a new password here silently kept
        // sealing with the old one and skipped the length check entirely.
        config = getSessionConfig(newSessionOptions);
        onUnsealError = newSessionOptions.onUnsealError;
      },
    },
    save: {
      value: async function save() {
        if (destroyed) {
          throw new Error(
            "iron-session: Cannot save a destroyed session. session.destroy() signs the user out, and saving afterwards would restore the cookie you just cleared. Get a fresh session if you need to write one.",
          );
        }

        jar.assertWritable?.();

        const seal = await sealData(session, {
          password: config.passwordsMap,
          ttl: config.ttl,
        });

        writeSeal(jar, config, seal);
      },
    },
    destroy: {
      value: function destroy() {
        destroyed = true;
        for (const key of Object.keys(session)) {
          delete (session as Record<string, unknown>)[key];
        }
        jar.write(config.cookieName, "", { ...config.cookieOptions, maxAge: 0 });
        // Leaving chunks behind would let a later read reassemble a stale seal.
        clearStaleCookies(jar, config.cookieName, config.cookieOptions, {
          whole: true,
          chunksUpTo: 0,
        });
      },
    },
  });

  return session as IronSession<T>;
}

/** Browsers cap one cookie at 4096 bytes over the whole `Set-Cookie` value. */
const MAX_COOKIE_BYTES = 4096;

/**
 * Hard cap on chunks, not configurable on purpose.
 *
 * Four chunks is already ~16 KB of `Cookie` header on every single request, and
 * nginx's default `large_client_header_buffers` is 8 KB. Letting people raise
 * this just moves the failure from our error message to a 400 at their CDN.
 */
const MAX_CHUNKS = 4;

const chunkName = (cookieName: string, index: number): string => `${cookieName}.${index}`;

function cookieBytes(name: string, value: string, cookieOptions: CookieOptions): number {
  return new TextEncoder().encode(serializeCookie(name, value, cookieOptions)).length;
}

/**
 * Reads the seal, whether it was stored in one cookie or split across several.
 *
 * Both shapes are always accepted regardless of the `chunk` setting, so turning
 * chunking on or off does not invalidate cookies that are already out there.
 *
 * Chunk discovery probes `name.0`, `name.1`, ... and stops at the first gap,
 * bounded by {@link MAX_CHUNKS}. There is deliberately no cookie holding the
 * chunk count: that value would be attacker-controlled, and a `name.count` of
 * 99999999 is free CPU amplification before anyone is authenticated.
 *
 * The chunks are concatenated and handed to `unseal` whole. Nothing here
 * inspects, validates or trusts an individual chunk, and that is what makes
 * reassembly safe: the HMAC already covers the entire seal string, so a deleted
 * chunk, reordered chunks, or a chunk swapped in from a different session all
 * fail integrity and land in the unreadable-cookie path.
 */
function readSeal(jar: CookieJar, cookieName: string): string {
  const whole = jar.read(cookieName);
  if (whole) {
    return whole;
  }

  let seal = "";
  for (let index = 0; index < MAX_CHUNKS; index += 1) {
    const part = jar.read(chunkName(cookieName, index));
    if (!part) {
      break;
    }
    seal += part;
  }

  return seal;
}

/**
 * Expires cookies that are no longer part of the session.
 *
 * This is the bug chunking would otherwise ship with. A session that shrinks
 * from three chunks to one leaves `name.1` and `name.2` in the browser, the next
 * read concatenates the new chunk 0 with the two stale ones, the HMAC fails, and
 * the user is signed out on every request from then on while `save()` keeps
 * reporting success. There is no error anywhere in that loop.
 *
 * Only cookies actually present on the request are expired, so a normal
 * unchunked save does not emit four pointless `Set-Cookie` headers. The expiry
 * reuses the same `path` and `domain` as the write, otherwise the browser treats
 * it as a different cookie and the delete does nothing.
 */
function clearStaleCookies(
  jar: CookieJar,
  cookieName: string,
  cookieOptions: CookieOptions,
  keep: { whole: boolean; chunksUpTo: number },
): void {
  const expire = (name: string): void => {
    if (jar.read(name)) {
      jar.write(name, "", { ...cookieOptions, maxAge: 0 });
    }
  };

  if (!keep.whole) {
    expire(cookieName);
  }

  for (let index = keep.chunksUpTo; index < MAX_CHUNKS; index += 1) {
    expire(chunkName(cookieName, index));
  }
}

/**
 * Writes the seal, splitting it across cookies when it does not fit and
 * chunking is enabled.
 *
 * The seal is split as an opaque string, after the version suffix is applied to
 * the whole thing. Rejoining is a plain concatenation with no separator.
 */
function writeSeal(jar: CookieJar, config: SessionConfig, seal: string): void {
  const { cookieName, cookieOptions } = config;
  const wholeBytes = cookieBytes(cookieName, seal, cookieOptions);

  if (wholeBytes <= MAX_COOKIE_BYTES) {
    jar.write(cookieName, seal, cookieOptions);
    clearStaleCookies(jar, cookieName, cookieOptions, { whole: true, chunksUpTo: 0 });
    return;
  }

  if (!config.chunk) {
    throw new Error(
      `iron-session: Cookie length is too big (${wholeBytes} bytes), browsers will refuse it. Remove some data from the session, or set \`chunk: true\` to split it across several cookies.`,
    );
  }

  // Every chunk index is a single digit because MAX_CHUNKS is 4, so all chunk
  // names are the same length and one budget works for all of them.
  const perChunkOverhead = cookieBytes(chunkName(cookieName, 0), "", cookieOptions);
  const budget = MAX_COOKIE_BYTES - perChunkOverhead;

  if (budget <= 0) {
    throw new Error(
      `iron-session: The cookie name and options alone take ${perChunkOverhead} bytes, which leaves no room for session data. Use a shorter cookie name.`,
    );
  }

  const chunks: string[] = [];
  for (let offset = 0; offset < seal.length; offset += budget) {
    chunks.push(seal.slice(offset, offset + budget));
  }

  if (chunks.length > MAX_CHUNKS) {
    throw new Error(
      `iron-session: The session needs ${chunks.length} cookies and the maximum is ${MAX_CHUNKS}. Even at ${MAX_CHUNKS} the whole Cookie header is sent on every request and proxies commonly cap it at 8 KB, so raising this would fail at your CDN instead. Store an id in the session and keep the data in your database.`,
    );
  }

  chunks.forEach((value, index) => {
    jar.write(chunkName(cookieName, index), value, cookieOptions);
  });

  clearStaleCookies(jar, cookieName, cookieOptions, {
    whole: false,
    chunksUpTo: chunks.length,
  });
}

const badUsageMessage =
  "iron-session: Bad usage: use getIronSession(req, res, options) or getIronSession(cookieStore, options).";

export async function getIronSession<T extends object>(
  cookies: CookieStore | CookieJar,
  sessionOptions: SessionOptions,
): Promise<IronSession<T>>;
export async function getIronSession<T extends object>(
  req: RequestType,
  res: ResponseType,
  sessionOptions: SessionOptions,
): Promise<IronSession<T>>;
export async function getIronSession<T extends object>(
  first: RequestType | CookieStore | CookieJar,
  second: ResponseType | SessionOptions,
  third?: SessionOptions,
): Promise<IronSession<T>> {
  if (!first || !second) {
    throw new Error(badUsageMessage);
  }

  // getIronSession(cookieStoreOrJar, options)
  if (!third) {
    const options = second as SessionOptions;

    if (isCookieJar(first)) {
      return createSession<T>(first, options);
    }

    if (isCookieStore(first)) {
      return createSession<T>(cookieStoreJar(first), options);
    }

    throw new Error(badUsageMessage);
  }

  // getIronSession(req, res, options), kept so Node and Express keep working
  // without a code change. It just picks the matching adapter.
  const req = first as RequestType;
  const res = second as ResponseType;
  const jar = isWebRequest(req)
    ? webCookies(req, res as Response)
    : nodeCookies(req, res as ServerResponse);

  return createSession<T>(jar, third);
}
