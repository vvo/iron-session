import { parse, serialize, type CookieSerializeOptions } from 'cookie'
import { defaults as ironDefaults, seal as ironSeal, unseal as ironUnseal } from 'iron-webcrypto'
import type { IncomingMessage, ServerResponse } from 'http'

type PasswordsMap = Record<string, string>
type Password = PasswordsMap | string

type RequestType = IncomingMessage | Request
type ResponseType = Response | ServerResponse

export interface IronSessionOptions {
  /**
   * The cookie name that will be used inside the browser. Make sure it's unique
   * given your application.
   *
   * @example 'vercel-session'
   */
  cookieName: string

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
  password: Password

  /**
   * The time (in seconds) that the session will be valid for. Also sets the
   * `max-age` attribute of the cookie automatically (`= ttl - 60s`, so that the
   * cookie always expire before the session).
   *
   * `ttl = 0` means no expiration.
   *
   * @default 1209600
   */
  ttl?: number

  /**
   * The options that will be passed to the cookie library.
   *
   * If you want to use "session cookies" (cookies that are deleted when the browser
   * is closed) then you need to pass `cookieOptions: { maxAge: undefined }`
   *
   * @see https://github.com/jshttp/cookie#options-1
   */
  cookieOptions?: CookieSerializeOptions
}

export type IronSession<T> = T & {
  /**
   * Destroys the session data and removes the cookie.
   */
  readonly destroy: (destroyOptions?: IronSessionOptions) => Promise<void>

  /**
   * Encrypts the session data and sets the cookie.
   */
  readonly save: (saveOptions?: IronSessionOptions) => Promise<void>
}

// default time allowed to check for iron seal validity when ttl passed
// see https://hapi.dev/module/iron/api/?v=7.0.1#options
const timestampSkewSec = 60
const fourteenDaysInSeconds = 14 * 24 * 3600

// We store a token major version to handle data format changes so that the cookies
// can be kept alive between upgrades, no need to disconnect everyone.
const currentMajorVersion = 2
const versionDelimiter = '~'

const defaultOptions: Required<Pick<IronSessionOptions, 'cookieOptions' | 'ttl'>> = {
  ttl: fourteenDaysInSeconds,
  cookieOptions: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
}

function normalizeStringPasswordToMap(password: Password): PasswordsMap {
  return typeof password === 'string' ? { 1: password } : password
}

function parseSeal(seal: string): { sealWithoutVersion: string; tokenVersion: number | null } {
  const [sealWithoutVersion, tokenVersionAsString] = seal.split(versionDelimiter)
  const tokenVersion = tokenVersionAsString == null ? null : parseInt(tokenVersionAsString, 10)

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { sealWithoutVersion: sealWithoutVersion!, tokenVersion }
}

function computeCookieMaxAge(ttl: number): number {
  if (ttl === 0) {
    // ttl = 0 means no expiration
    // but in reality cookies have to expire (can't have no max-age)
    // 2147483647 is the max value for max-age in cookies
    // see https://stackoverflow.com/a/11685301/147079
    return 2147483647
  }

  // The next line makes sure browser will expire cookies before seals are considered expired by the server.
  // It also allows for clock difference of 60 seconds between server and clients.
  return ttl - timestampSkewSec
}

function addToCookies(cookieValue: string, res: ResponseType): void {
  if ('headers' in res) {
    res.headers.append('set-cookie', cookieValue)
    return
  }

  let existingSetCookie = (res.getHeader('set-cookie') ?? []) as string[] | string
  if (typeof existingSetCookie === 'string') {
    existingSetCookie = [existingSetCookie]
  }
  res.setHeader('set-cookie', [...existingSetCookie, cookieValue])
}

export function createSealData(_crypto: Crypto = globalThis.crypto) {
  return async function sealData(
    data: unknown,
    { password, ttl = fourteenDaysInSeconds }: { password: Password; ttl?: number }
  ): Promise<string> {
    const passwordsMap = normalizeStringPasswordToMap(password)

    const mostRecentPasswordId = Math.max(...Object.keys(passwordsMap).map(Number))
    const passwordForSeal = {
      id: mostRecentPasswordId.toString(),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      secret: passwordsMap[mostRecentPasswordId]!,
    }

    const seal = await ironSeal(_crypto, data, passwordForSeal, {
      ...ironDefaults,
      ttl: ttl * 1000,
    })

    return `${seal}${versionDelimiter}${currentMajorVersion}`
  }
}

export function createUnsealData(_crypto: Crypto = globalThis.crypto) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return async function unsealData<T extends {} = {}>(
    seal: string,
    { password, ttl = fourteenDaysInSeconds }: { password: Password; ttl?: number }
  ): Promise<T> {
    const passwordsMap = normalizeStringPasswordToMap(password)
    const { sealWithoutVersion, tokenVersion } = parseSeal(seal)

    try {
      const data =
        (await ironUnseal(_crypto, sealWithoutVersion, passwordsMap, {
          ...ironDefaults,
          ttl: ttl * 1000,
        })) ?? {}

      if (tokenVersion === 2) {
        return data as T
      }

      // @ts-expect-error `persistent` does not exist on newer tokens
      return { ...data.persistent } as T
    } catch (error) {
      if (
        error instanceof Error &&
        /^(Expired seal|Bad hmac value|Cannot find password|Incorrect number of sealed components)/.test(
          error.message
        )
      ) {
        // if seal expired or
        // if seal is not valid (encrypted using a different password, when passwords are badly rotated) or
        // if we can't find back the password in the seal
        // then we just start a new session over
        return {} as T
      }

      throw error
    }
  }
}

export function createGetIronSession(
  sealData: ReturnType<typeof createSealData>,
  unsealData: ReturnType<typeof createUnsealData>
) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return async function getIronSession<T extends {} = {}>(
    req: RequestType,
    res: ResponseType,
    userSessionOptions: IronSessionOptions
  ): Promise<IronSession<T>> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (!req) {
      throw new Error('iron-session: Bad usage. Missing request parameter.')
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (!res) {
      throw new Error('iron-session: Bad usage. Missing response parameter.')
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (!userSessionOptions) {
      throw new Error('iron-session: Bad usage. Missing options.')
    }

    if (!userSessionOptions.cookieName) {
      throw new Error('iron-session: Bad usage. Missing cookie name.')
    }

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!userSessionOptions.password) {
      throw new Error('iron-session: Bad usage. Missing password.')
    }

    const passwordsMap = normalizeStringPasswordToMap(userSessionOptions.password)
    if (Object.values(passwordsMap).some((password) => password.length < 32)) {
      throw new Error('iron-session: Bad usage. Password must be at least 32 characters long.')
    }

    const options: Required<IronSessionOptions> = {
      ...defaultOptions,
      ...userSessionOptions,
      cookieOptions: { ...defaultOptions.cookieOptions, ...userSessionOptions.cookieOptions },
    }

    if (userSessionOptions.cookieOptions && 'maxAge' in userSessionOptions.cookieOptions) {
      if (userSessionOptions.cookieOptions.maxAge === undefined) {
        // session cookies, do not set maxAge, consider token as infinite
        options.ttl = 0
      }
    } else {
      options.cookieOptions.maxAge = computeCookieMaxAge(options.ttl)
    }

    const sealFromCookies =
      parse(('credentials' in req ? req.headers.get('cookie') : req.headers.cookie) ?? '')[
        options.cookieName
      ] ?? ''

    const session = sealFromCookies
      ? await unsealData<T>(sealFromCookies, { password: passwordsMap, ttl: options.ttl })
      : ({} as T)

    Object.defineProperties(session, {
      save: {
        value: async function save(saveOptions?: IronSessionOptions) {
          if ('headersSent' in res && res.headersSent) {
            throw new Error(
              'iron-session: Cannot set session cookie: session.save() was called after headers were sent. Make sure to call it before any res.send() or res.end()'
            )
          }

          const mergedOptions: Required<IronSessionOptions> = {
            ...options,
            ...saveOptions,
            cookieOptions: { ...options.cookieOptions, ...saveOptions?.cookieOptions },
          }

          const seal = await sealData(session, { password: passwordsMap, ttl: mergedOptions.ttl })
          const cookieValue = serialize(mergedOptions.cookieName, seal, mergedOptions.cookieOptions)

          if (cookieValue.length > 4096) {
            throw new Error(
              `iron-session: Cookie length is too big (${cookieValue.length} bytes), browsers will refuse it. Try to remove some data.`
            )
          }

          addToCookies(cookieValue, res)
        },
      },

      destroy: {
        value: async function destroy(destroyOptions?: IronSessionOptions) {
          Object.keys(session).forEach((key) => {
            // @ts-expect-error ...
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete session[key]
          })

          const mergedOptions: Required<IronSessionOptions> = {
            ...options,
            ...destroyOptions,
            cookieOptions: { ...options.cookieOptions, ...destroyOptions?.cookieOptions },
          }

          const cookieValue = serialize(mergedOptions.cookieName, '', {
            ...mergedOptions.cookieOptions,
            maxAge: 0,
          })

          addToCookies(cookieValue, res)
        },
      },
    })

    return session as IronSession<T>
  }
}
