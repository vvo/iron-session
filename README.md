# iron-session

A runtime-agnostic stateless session utility. Works with Next.js, Node.js, Deno,
Bun, and more.

The session data is stored in signed and encrypted cookies ("seals") which can
only be decoded by your server. There are no session ids, making sessions
"stateless" from the server point of view. This strategy of storing session data
is the same technique used by frameworks like
[Ruby On Rails](https://guides.rubyonrails.org/security.html#session-storage).

## Table of Contents

<!-- - [Features](#features) -->

- [Installation](#installation)
- [Usage](#usage)
- [Options Definitions](#options-definitions)
- [API](#api)
  - [Iron Session Object](#iron-session-object)
  - [Functions](#iron-session-functions)
  - [Options](#iron-session-options)
  - [Example](#nextjs-example)
- [FAQ](#faq)
  <!-- - [Contributing](#contributing) -->
  <!-- - [License](#license) -->
- [Credits](#credits)
- [Good Reads](#good-reads)

## Installation

```sh
npm add iron-session
```

Change the package manager to whatever you use, of course. On Deno, you can use
[esm.sh](https://esm.sh/):

```js
import { getIronSession } from 'https://esm.sh/iron-session@latest'
```

## Usage

Refer to the [examples](examples).

1. Define your session options
1. Initialize your session with:
    - sessionOptions and the respective parameters
    - the type definition of your session data
1. Set the session data variables
1. Set the data to or read the data from the browser cookie storage
    - session.save(): Set the session variables as an encrypted string to the browser cookie storage
    - session.destroy(): Set cookie value in the browser cookie storage as an empty value to clear the cookie data
    - Read the session variables by decrypting the encrypted string from the cookie browser storage

## Options Definitions

Only two options are required: `password` and `cookieName`. Everything else is automatically computed and usually doesn't need to be changed.

- `password`, **required**: Private key used to encrypt the cookie. It has to be at least 32 characters long. Use <https://1password.com/password-generator/> to generate strong passwords. `password` can be either a `string` or an `array` of objects like this: `[{id: 2, password: "..."}, {id: 1, password: "..."}]` to allow for password rotation.
- `cookieName`, **required**: Name of the cookie to be stored
- `ttl`, _optional_: In seconds. Default to the equivalent of 14 days. You can set this to `0` and iron-session will compute the maximum allowed value by cookies (~70 years).
- `cookieOptions`, _optional_: Any option available from [jshttp/cookie#serialize](https://github.com/jshttp/cookie#cookieserializename-value-options) except for `encode` which is not a Set-Cookie Attribute. See [Mozilla Set-Cookie Attributes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#attributes) and [Chrome Cookie Fields](https://developer.chrome.com/docs/devtools/application/cookies/#fields). Default to:

```js
{
  httpOnly: true,
  secure: true, // true when using https, false otherwise
  sameSite: "lax", // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite#lax
  // The next line makes sure browser will expire cookies before seals are considered expired by the server. It also allows for clock difference of 60 seconds maximum between servers and clients.
  maxAge: (ttl === 0 ? 2147483647 : ttl) - 60,
  path: "/",
  // other options:
  // domain, if you want the cookie to be valid for the whole domain and subdomains, use domain: example.com
  // expires, there should be no need to use this option, maxAge takes precedence
  // ...
}
```

The final type definition for `CookieOptions` ends up to be

`'domain' | 'path' | 'secure' | 'sameSite' | 'name' | 'value' | 'expires' | 'httpOnly' | 'maxAge' | 'priority'`

### Type Definitions from iron-session/dist/index.node.d.cts

#### IronSessionOptions

```ts
interface IronSessionOptions {
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
```

##### CookieOptions

```ts
/**
 * Set-Cookie Attributes do not include `encode`. We omit this from our `cookieOptions` type.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
 * @see https://developer.chrome.com/docs/devtools/application/cookies/
 */
type CookieOptions = Omit<CookieSerializeOptions, 'encode'>
```

##### CookieSerializeOptions

```ts
interface CookieSerializeOptions {
    /**
     * Specifies the value for the {@link https://tools.ietf.org/html/rfc6265#section-5.2.3|Domain Set-Cookie attribute}. By default, no
     * domain is set, and most clients will consider the cookie to apply to only
     * the current domain.
     */
    domain?: string | undefined;

    /**
     * Specifies a function that will be used to encode a cookie's value. Since
     * value of a cookie has a limited character set (and must be a simple
     * string), this function can be used to encode a value into a string suited
     * for a cookie's value.
     *
     * The default function is the global `encodeURIComponent`, which will
     * encode a JavaScript string into UTF-8 byte sequences and then URL-encode
     * any that fall outside of the cookie range.
     */
    encode?(value: string): string;

    /**
     * Specifies the `Date` object to be the value for the {@link https://tools.ietf.org/html/rfc6265#section-5.2.1|`Expires` `Set-Cookie` attribute}. By default,
     * no expiration is set, and most clients will consider this a "non-persistent cookie" and will delete
     * it on a condition like exiting a web browser application.
     *
     * *Note* the {@link https://tools.ietf.org/html/rfc6265#section-5.3|cookie storage model specification}
     * states that if both `expires` and `maxAge` are set, then `maxAge` takes precedence, but it is
     * possible not all clients by obey this, so if both are set, they should
     * point to the same date and time.
     */
    expires?: Date | undefined;
    /**
     * Specifies the boolean value for the {@link https://tools.ietf.org/html/rfc6265#section-5.2.6|`HttpOnly` `Set-Cookie` attribute}.
     * When truthy, the `HttpOnly` attribute is set, otherwise it is not. By
     * default, the `HttpOnly` attribute is not set.
     *
     * *Note* be careful when setting this to true, as compliant clients will
     * not allow client-side JavaScript to see the cookie in `document.cookie`.
     */
    httpOnly?: boolean | undefined;
    /**
     * Specifies the number (in seconds) to be the value for the `Max-Age`
     * `Set-Cookie` attribute. The given number will be converted to an integer
     * by rounding down. By default, no maximum age is set.
     *
     * *Note* the {@link https://tools.ietf.org/html/rfc6265#section-5.3|cookie storage model specification}
     * states that if both `expires` and `maxAge` are set, then `maxAge` takes precedence, but it is
     * possible not all clients by obey this, so if both are set, they should
     * point to the same date and time.
     */
    maxAge?: number | undefined;
    /**
     * Specifies the value for the {@link https://tools.ietf.org/html/rfc6265#section-5.2.4|`Path` `Set-Cookie` attribute}.
     * By default, the path is considered the "default path".
     */
    path?: string | undefined;
    /**
     * Specifies the `string` to be the value for the [`Priority` `Set-Cookie` attribute][rfc-west-cookie-priority-00-4.1].
     *
     * - `'low'` will set the `Priority` attribute to `Low`.
     * - `'medium'` will set the `Priority` attribute to `Medium`, the default priority when not set.
     * - `'high'` will set the `Priority` attribute to `High`.
     *
     * More information about the different priority levels can be found in
     * [the specification][rfc-west-cookie-priority-00-4.1].
     *
     * **note** This is an attribute that has not yet been fully standardized, and may change in the future.
     * This also means many clients may ignore this attribute until they understand it.
     */
    priority?: 'low' | 'medium' | 'high' | undefined;
    /**
     * Specifies the boolean or string to be the value for the {@link https://tools.ietf.org/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.7|`SameSite` `Set-Cookie` attribute}.
     *
     * - `true` will set the `SameSite` attribute to `Strict` for strict same
     * site enforcement.
     * - `false` will not set the `SameSite` attribute.
     * - `'lax'` will set the `SameSite` attribute to Lax for lax same site
     * enforcement.
     * - `'strict'` will set the `SameSite` attribute to Strict for strict same
     * site enforcement.
     *  - `'none'` will set the SameSite attribute to None for an explicit
     *  cross-site cookie.
     *
     * More information about the different enforcement levels can be found in {@link https://tools.ietf.org/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.7|the specification}.
     *
     * *note* This is an attribute that has not yet been fully standardized, and may change in the future. This also means many clients may ignore this attribute until they understand it.
     */
    sameSite?: true | false | 'lax' | 'strict' | 'none' | undefined;
    /**
     * Specifies the boolean value for the {@link https://tools.ietf.org/html/rfc6265#section-5.2.5|`Secure` `Set-Cookie` attribute}. When truthy, the
     * `Secure` attribute is set, otherwise it is not. By default, the `Secure` attribute is not set.
     *
     * *Note* be careful when setting this to `true`, as compliant clients will
     * not send the cookie back to the server in the future if the browser does
     * not have an HTTPS connection.
     */
    secure?: boolean | undefined;
}

```

## API

## Iron Session Object

### getIronSession(req: Request | IncomingMessage, res: Response | ServerResponse<IncomingMessage>, userSessionOptions: IronSessionOptions): Promise<IronSession<T>>

```ts
const session = getIronSession<IronSessionData>(req, res, sessionOptions)
```

The API Route Handler that uses `getIronSession` and returns the Response needs to be called from a client-side environment (ie. a 'use client' file).

### getServerActionIronSession(userSessionOptions: IronSessionOptions, cookieHandler: ICookieHandler): Promise<IronSession<T>>

```ts
const session = getServerActionIronSession<IronSessionData>(sessionOptions, cookies())
```

The `getServerActionIronSession` implementation uses the `cookies()` function from next/headers to set the cookies so that Iron Session can be used in NextJS Server Actions and React Server Components in a server-side environment (ie. a 'use server' file).

## Iron Session Functions

### session.save(saveOptions?: OverridableOptions)

Saves the session and sets the cookie header to be sent once the response is sent.

```ts
await session.save()
```

### session.destroy(destroyOptions?: OverridableOptions)

Empties the session object and sets the cookie header to be sent once the response is sent. The browser will then set the cookie value as an empty value.

```ts
await session.destroy()
```

Upon calling either `session.save()` or `session.destroy()` the session values are saved to the browser cookie storage.

## Iron Session Options

### Default Options

```ts
const defaultOptions: Required<OverridableOptions> = {
  ttl: fourteenDaysInSeconds,
  cookieOptions: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
}
```

### User Session Options

You may apply options during the Iron Session object initialization. These options will superseded and override any options set in Default Options. For example: refer to `cookieOptions` in `lib/session.ts` in the below [NextJS Example](#nextjs-example).

### Override Options

You may apply options during the `.save()` or `.destroy()` function calls.  These options will superseded and override any options set in Default Options and User Session Options.

For example:

```ts
type OverridableOptions = {
    ttl?: number;
    cookieOptions?: CookieOptions;
}
```

```ts
await session.save({ cookieOptions: { priority: 'high'} })
```

## NextJS Example

#### lib/session.ts

```ts
import {
  IronSessionOptions, getIronSession, IronSessionData, getServerActionIronSession
} from 'iron-session'

import { cookies } from 'next/headers';

export const sessionOptions: IronSessionOptions = {
  password: 'change-this-this-is-not-a-secure-password',
  cookieName: 'cookieNameInBrowser',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
}

declare module 'iron-session' {
  interface IronSessionData {
    cookieVariable?: string;
  }
}

const getSession = async (req: Request, res: Response) => {
  const session = getIronSession<IronSessionData>(req, res, sessionOptions)
  return session
}

const getServerActionSession = async () => {
  const session = getServerActionIronSession<IronSessionData>(sessionOptions, cookies())
  return session
}

export {
  getSession,
  getServerActionSession
}
```

### getIronSession

#### src/app/clientActions.ts

```ts
'use client'

export const submitCookieToStorageRouteHandler = async (cookie: string) => {
  await fetch('http://localhost:3000/api/submitIronSessionCookie', {
    method: 'POST',
    body: JSON.stringify({
      cookie,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const readCookieFromStorageRouteHandler = async (): Promise<string> => {
  const responseWithCookieFromStorage = await fetch('http://localhost:3000/api/readIronSessionCookie', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await responseWithCookieFromStorage.json();
  const cookieValue = data?.cookieInStorage || 'No Cookie In Storage'
  return cookieValue
}
```

#### src/api/submitIronSessionCookie/route.ts

```ts
import { getSession } from '../../../../lib/session'

export async function POST(request: Request) {
  try {
    const requestBody = await request.json()
    const { cookie }: { cookie: string } = requestBody
    const response = new Response()
    const session = await getSession(request, response)
    session.cookieVariable = cookie
    await session.save()
    return response
  } catch (error: unknown) {
    console.error((error as Error).message)
    return new Response(JSON.stringify({ message: (error as Error).message }), { status: 500 })
  }
}
```

#### src/api/readIronSessionCookie/route.ts

```ts
import { NextResponse } from 'next/server'
import { getSession } from '../../../../lib/session'

export async function GET(request: Request, response: Response) {
  try {
    const session = await getSession(request, response)
    const cookeValue = session.cookieVariable || 'No Cookie Stored!'
    return NextResponse.json({ cookieInStorage: cookeValue })
  } catch (error: unknown) {
    console.error((error as Error).message)
    return new Response(JSON.stringify({ message: (error as Error).message }), { status: 500 })
  }
}
```

### getServerActionIronSession

#### src/app/serverActions.ts

```ts
'use server'

import { getServerActionSession } from '../../lib/session'

export const submitCookieToStorageServerAction = async (cookie: string) => {
  const session = await getServerActionSession()
  session.cookieVariable = cookie
  await session.save()
}

export const readCookieFromStorageServerAction = async (): Promise<string> => {
  const session = await getServerActionSession()
  return session.cookieVariable || 'No Cookie Stored!'
}
```

#### next.config.js

```ts
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      serverActions: true,
    },
  }

module.exports = nextConfig
```

## FAQ

### When should I use getIronSession or getServerActionIronSession?

Use `getIronSession` when you wish to use Iron Session in a client-side environment with API Route Handlers and use  `getServerActionIronSession` when you wish to use Iron Session in a server-side environment with Server Components.

For NextJS projects using App Router with Server Actions enabled in their `next.config.js` file, using `getServerActionIronSession` is preferable for two reasons:

- allows Iron Session to be called and used from a server-side environment
- allows for more concise code. Server Actions can be called directly from your components without the need for a manually created API route. You can see the smaller amount of code used for `getServerActionIronSession` compared to `getIronSession` in the example.

## Credits

- [Eran Hammer and hapi.js contributors](https://github.com/hapijs/iron/graphs/contributors)
  for creating the underlying cryptography library
  [`@hapi/iron`](https://hapi.dev/module/iron/).
- [Divyansh Singh](https://github.com/brc-dd) for reimplementing `@hapi/iron` as
  [`iron-webcrypto`](https://github.com/brc-dd/iron-webcrypto) using standard
  web APIs.
- [Hoang Vo](https://github.com/hoangvvo) for advice and guidance while building
  this module. Hoang built
  [`next-connect`](https://github.com/hoangvvo/next-connect) and
  [`next-session`](https://github.com/hoangvvo/next-session).
- All the
  [contributors](https://github.com/vvo/iron-session/graphs/contributors) for
  making this project better.

## Good Reads

- <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>
- <https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html>
