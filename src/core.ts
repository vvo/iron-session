import type { IncomingMessage, ServerResponse } from "http";
import { parse, serialize, type CookieSerializeOptions } from "cookie";
import {
  defaults as ironDefaults,
  seal as ironSeal,
  unseal as ironUnseal,
} from "iron-webcrypto";

type PasswordsMap = Record<string, string>;
type Password = PasswordsMap | string;
type RequestType = IncomingMessage | Request;
type ResponseType = Response | ServerResponse;

/**
 * {@link https://wicg.github.io/cookie-store/#dictdef-cookielistitem CookieListItem}
 * as specified by W3C.
 */
interface CookieListItem
  extends Pick<
    CookieSerializeOptions,
    "domain" | "path" | "sameSite" | "secure"
  > {
  /** A string with the name of a cookie. */
  name: string;
  /** A string containing the value of the cookie. */
  value: string;
  /** A number of milliseconds or Date interface containing the expires of the cookie. */
  expires?: CookieSerializeOptions["expires"] | number;
}

/**
 * Superset of {@link CookieListItem} extending it with
 * the `httpOnly`, `maxAge` and `priority` properties.
 */
type ResponseCookie = CookieListItem &
  Pick<CookieSerializeOptions, "httpOnly" | "maxAge" | "priority">;

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
 * Set-Cookie Attributes do not include `encode`. We omit this from our `cookieOptions` type.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
 * @see https://developer.chrome.com/docs/devtools/application/cookies/
 */
type CookieOptions = Omit<CookieSerializeOptions, "encode">;

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

const defaultOptions: Required<Pick<SessionOptions, "ttl" | "cookieOptions">> =
  {
    ttl: fourteenDaysInSeconds,
    cookieOptions: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  };

function normalizeStringPasswordToMap(password: Password): PasswordsMap {
  return typeof password === "string" ? { 1: password } : password;
}

function parseSeal(seal: string): {
  sealWithoutVersion: string;
  tokenVersion: number | null;
} {
  const [sealWithoutVersion, tokenVersionAsString] =
    seal.split(versionDelimiter);
  const tokenVersion =
    tokenVersionAsString == null ? null : parseInt(tokenVersionAsString, 10);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { sealWithoutVersion: sealWithoutVersion!, tokenVersion };
}

function computeCookieMaxAge(ttl: number): number {
  if (ttl === 0) {
    // ttl = 0 means no expiration
    // but in reality cookies have to expire (can't have no max-age)
    // 2147483647 is the max value for max-age in cookies
    // see https://stackoverflow.com/a/11685301/147079
    return 2147483647;
  }

  // The next line makes sure browser will expire cookies before seals are considered expired by the server.
  // It also allows for clock difference of 60 seconds between server and clients.
  return ttl - timestampSkewSec;
}

function getCookie(req: RequestType, cookieName: string): string {
  return (
    parse(
      ("headers" in req && typeof req.headers.get === "function"
        ? req.headers.get("cookie")
        : (req as IncomingMessage).headers.cookie) ?? "",
    )[cookieName] ?? ""
  );
}

function getServerActionCookie(
  cookieName: string,
  cookieHandler: CookieStore,
): string {
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
  (res as ServerResponse).setHeader("set-cookie", [
    ...existingSetCookie,
    cookieValue,
  ]);
}

export function createSealData(_crypto: Crypto) {
  return async function sealData(
    data: unknown,
    {
      password,
      ttl = fourteenDaysInSeconds,
    }: { password: Password; ttl?: number },
  ): Promise<string> {
    const passwordsMap = normalizeStringPasswordToMap(password);

    const mostRecentPasswordId = Math.max(
      ...Object.keys(passwordsMap).map(Number),
    );
    const passwordForSeal = {
      id: mostRecentPasswordId.toString(),
      secret: passwordsMap[mostRecentPasswordId]!,
    };

    const seal = await ironSeal(_crypto, data, passwordForSeal, {
      ...ironDefaults,
      ttl: ttl * 1000,
    });

    return `${seal}${versionDelimiter}${currentMajorVersion}`;
  };
}

export function createUnsealData(_crypto: Crypto) {
  return async function unsealData<T>(
    seal: string,
    {
      password,
      ttl = fourteenDaysInSeconds,
    }: { password: Password; ttl?: number },
  ): Promise<T> {
    const passwordsMap = normalizeStringPasswordToMap(password);
    const { sealWithoutVersion, tokenVersion } = parseSeal(seal);

    try {
      const data =
        (await ironUnseal(_crypto, sealWithoutVersion, passwordsMap, {
          ...ironDefaults,
          ttl: ttl * 1000,
        })) ?? {};

      if (tokenVersion === 2) {
        return data as T;
      }

      // @ts-expect-error `persistent` does not exist on newer tokens
      return { ...data.persistent } as T;
    } catch (error) {
      if (
        error instanceof Error &&
        /^(Expired seal|Bad hmac value|Cannot find password|Incorrect number of sealed components)/.test(
          error.message,
        )
      ) {
        // if seal expired or
        // if seal is not valid (encrypted using a different password, when passwords are badly rotated) or
        // if we can't find back the password in the seal
        // then we just start a new session over
        return {} as T;
      }

      throw error;
    }
  };
}

function getSessionConfig(
  sessionOptions: SessionOptions,
): Required<SessionOptions> {
  const options = {
    ...defaultOptions,
    ...sessionOptions,
    cookieOptions: {
      ...defaultOptions.cookieOptions,
      ...(sessionOptions.cookieOptions || {}),
    },
  };

  if (
    sessionOptions.cookieOptions &&
    "maxAge" in sessionOptions.cookieOptions
  ) {
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

export function createGetIronSession(
  sealData: ReturnType<typeof createSealData>,
  unsealData: ReturnType<typeof createUnsealData>,
) {
  return getIronSession;

  async function getIronSession<T extends object>(
    cookies: CookieStore,
    sessionOptions: SessionOptions,
  ): Promise<IronSession<T>>;
  async function getIronSession<T extends object>(
    req: RequestType,
    res: ResponseType,
    sessionOptions: SessionOptions,
  ): Promise<IronSession<T>>;
  async function getIronSession<T extends object>(
    reqOrCookieStore: RequestType | CookieStore,
    resOrsessionOptions: ResponseType | SessionOptions,
    sessionOptions?: SessionOptions,
  ): Promise<IronSession<T>> {
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
        sealData,
        unsealData,
      );
    }

    const req = reqOrCookieStore as RequestType;
    const res = resOrsessionOptions as ResponseType;

    if (!sessionOptions) {
      throw new Error(badUsageMessage);
    }

    if (!sessionOptions.cookieName) {
      throw new Error("iron-session: Bad usage. Missing cookie name.");
    }

    if (!sessionOptions.password) {
      throw new Error("iron-session: Bad usage. Missing password.");
    }

    const passwordsMap = normalizeStringPasswordToMap(sessionOptions.password);

    if (Object.values(passwordsMap).some((password) => password.length < 32)) {
      throw new Error(
        "iron-session: Bad usage. Password must be at least 32 characters long.",
      );
    }

    let sessionConfig = getSessionConfig(sessionOptions);

    const sealFromCookies = getCookie(req, sessionConfig.cookieName);
    const session = sealFromCookies
      ? await unsealData<T>(sealFromCookies, {
          password: passwordsMap,
          ttl: sessionConfig.ttl,
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
          const cookieValue = serialize(
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
          const cookieValue = serialize(sessionConfig.cookieName, "", {
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
  sealData: ReturnType<typeof createSealData>,
  unsealData: ReturnType<typeof createUnsealData>,
): Promise<IronSession<T>> {
  if (!sessionOptions.cookieName) {
    throw new Error("iron-session: Bad usage. Missing cookie name.");
  }

  if (!sessionOptions.password) {
    throw new Error("iron-session: Bad usage. Missing password.");
  }

  const passwordsMap = normalizeStringPasswordToMap(sessionOptions.password);

  if (Object.values(passwordsMap).some((password) => password.length < 32)) {
    throw new Error(
      "iron-session: Bad usage. Password must be at least 32 characters long.",
    );
  }

  let sessionConfig = getSessionConfig(sessionOptions);
  const sealFromCookies = getServerActionCookie(
    sessionConfig.cookieName,
    cookieStore,
  );
  const session = sealFromCookies
    ? await unsealData<T>(sealFromCookies, {
        password: passwordsMap,
        ttl: sessionConfig.ttl,
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

        cookieStore.set(
          sessionConfig.cookieName,
          seal,
          sessionConfig.cookieOptions,
        );
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
