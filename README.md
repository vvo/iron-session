# iron-session ![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/vvo/iron-session/ci.yaml) [![GitHub license](https://img.shields.io/github/license/vvo/iron-session?style=flat)](https://github.com/vvo/iron-session/blob/master/LICENSE) [![npm](https://img.shields.io/npm/v/iron-session)](https://www.npmjs.com/package/iron-session) ![npm](https://img.shields.io/npm/dm/iron-session) ![npm package minimized gzipped size (select exports)](https://img.shields.io/bundlejs/size/iron-session?exports=getIronSession)

**`iron-session` is a secure, stateless, and cookie-based session library for JavaScript.**

---

The session data is stored in signed and encrypted cookies which are decoded by your server code in a stateless fashion (= no network involved). This is the same technique used by frameworks like
[Ruby On Rails](https://guides.rubyonrails.org/security.html#session-storage).

<p align="center"><i>Online demo and examples: <a href="https://get-iron-session.vercel.app/">https://get-iron-session.vercel.app</a></i> 👀 <br/>
 <i>Featured in the <a href="https://nextjs.org/docs/app/guides/authentication">Next.js documentation</a></i> ⭐️</p>

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Usage](#usage)
- [Examples](#examples)
- [Runtimes](#runtimes)
- [Session size](#session-size)
- [Watching for unreadable cookies](#watching-for-unreadable-cookies)
- [Validating session data](#validating-session-data)
- [Project status](#project-status)
- [Session options](#session-options)
- [API](#api)
  - [`getIronSession<T>(req, res, sessionOptions): Promise<IronSession<T>>`](#getironsessiontreq-res-sessionoptions-promiseironsessiont)
  - [`getIronSession<T>(cookieStore, sessionOptions): Promise<IronSession<T>>`](#getironsessiontcookiestore-sessionoptions-promiseironsessiont)
  - [`session.save(): Promise<void>`](#sessionsave-promisevoid)
  - [`session.destroy(): void`](#sessiondestroy-void)
  - [`session.updateConfig(sessionOptions: SessionOptions): void`](#sessionupdateconfigsessionoptions-sessionoptions-void)
  - [`sealData(data: unknown, { password, ttl }): Promise<string>`](#sealdatadata-unknown--password-ttl--promisestring)
  - [`unsealData<T>(seal: string, { password, ttl }): Promise<T>`](#unsealdatatseal-string--password-ttl--promiset)
- [FAQ](#faq)
  - [Why use pure cookies for sessions?](#why-use-pure-cookies-for-sessions)
  - [How to invalidate sessions?](#how-to-invalidate-sessions)
  - [Can I use something else than cookies?](#can-i-use-something-else-than-cookies)
  - [How is this different from JWT?](#how-is-this-different-from-jwt)
- [Credits](#credits)
- [Good Reads](#good-reads)

## Installation

```sh
pnpm add iron-session
```

## Usage

_We have extensive examples here too: https://get-iron-session.vercel.app/._

To get a session, there's a single method to know: `getIronSession`.

```ts
// Next.js API Routes and Node.js/Express/Connect.
import { getIronSession } from "iron-session";

export async function get(req, res) {
  const session = await getIronSession(req, res, { password: "...", cookieName: "..." });
  return session;
}

export async function post(req, res) {
  const session = await getIronSession(req, res, { password: "...", cookieName: "..." });
  session.username = "Alison";
  await session.save();
}
```

```ts
// Next.js Route Handlers (App Router)
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";

export async function GET() {
  const session = await getIronSession(await cookies(), { password: "...", cookieName: "..." });
  return session;
}

export async function POST() {
  const session = await getIronSession(await cookies(), { password: "...", cookieName: "..." });
  session.username = "Alison";
  await session.save();
}
```

```tsx
// Next.js Server Components and Server Actions (App Router)
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";

async function getIronSessionData() {
  const session = await getIronSession(await cookies(), { password: "...", cookieName: "..." });
  return session;
}

async function Profile() {
  const session = await getIronSessionData();

  return <div>{session.username}</div>;
}
```

```ts
// Next.js proxy.ts (middleware.ts before Next 16)
import { NextResponse, type NextRequest } from "next/server";
import { getIronSession, nextProxyCookies } from "iron-session";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession(nextProxyCookies(request, response), options);

  session.lastSeen = Date.now();
  await session.save();

  return response;
}
```

Middleware needs the adapter because Next only merges a cookie into the current
render when it goes through `response.cookies.set()`. Writing a raw `Set-Cookie`
header there looks like it works and then has no effect.

## Examples

We have many different patterns and examples on the online demo, have a look: https://get-iron-session.vercel.app/.

## Runtimes

`getIronSession(req, res, options)` covers Node, Express, Connect and Next.js
API routes, and `getIronSession(await cookies(), options)` covers the Next.js App
Router. When you want to be explicit, or when your framework hands you something
else, pass an adapter instead:

| Adapter                                  | For                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `nodeCookies(req, res)`                  | Node `http`, Express, Connect, Next.js API routes                          |
| `webCookies(request, responseOrHeaders)` | Anything web-standard: Hono, Bun, Deno, Cloudflare Workers, Route Handlers |
| `nextProxyCookies(request, response)`    | Next.js Proxy (middleware), `proxy.ts`                                     |

Anything with `get(name)` and `set(name, value, options)`, like Next's
`cookies()`, can be passed directly. If your framework has neither, a cookie jar
is two functions:

```ts
const session = await getIronSession(
  {
    read: (name) => myFramework.getCookie(name),
    write: (name, value, options) => myFramework.setCookie(name, value, options),
  },
  options,
);
```

## Session size

A browser refuses a cookie over 4096 bytes, and iron-session throws rather than
letting one be silently dropped. Encryption adds overhead, so plan for roughly
3KB of actual data.

If you need more, `chunk: true` splits the session across several cookies. Before
you reach for it, know what the real limit is: every cookie is sent on **every
request**, and proxies cap the whole `Cookie` header well below what a few
chunks produce. nginx allows 8KB by default and a CDN in front of it may allow
less. Going over returns a 400 or 431 at the edge, before your code runs.
iron-session refuses more than 4 chunks for that reason.

The scalable answer is to keep an id in the session and the data in your
database:

```ts
session.userId = user.id; // small, stateless
const user = await db.user.findUnique({ where: { id: session.userId } });
```

## Watching for unreadable cookies

When a cookie cannot be read, iron-session starts a new empty session instead of
throwing. It has to: it cannot tell a tampered cookie from a password you
rotated out or a seal that simply expired, and a 500 on every request would be
worse. That makes real problems invisible, so log them:

```ts
const options = {
  cookieName: "session",
  password: process.env.SESSION_PASSWORD,
  onUnsealError: (reason, error) => {
    // "expired" is normal, that is how sessions end.
    if (reason !== "expired") {
      logger.warn({ reason, error }, "session cookie rejected");
    }
  },
};
```

A burst of `"unknown-password"` usually means a password rotation went wrong. A
burst of `"invalid"` can mean someone is probing your cookies.

## Validating session data

There is no `validate` option, on purpose. If you change the shape of your
session, old cookies still decrypt into the old shape, and the place to handle
that is the wrapper you already have:

```ts
// lib/session.ts
export async function getSession() {
  const session = await getIronSession<Session>(await cookies(), options);

  if (session.user && !SessionSchema.safeParse({ ...session }).success) {
    session.destroy();
  }

  return session;
}
```

## Project status

✅ Production ready and maintained.

## Session options

Two options are required: `password` and `cookieName`. Everything else is automatically computed and usually doesn't need to be changed.

- `password`, **required**: Private key used to encrypt the cookie. It has to be at least 32 characters long. Use <https://1password.com/password-generator/> to generate strong passwords. `password` can be either a `string` or an `object` with incrementing keys like this: `{2: "...", 1: "..."}` to allow for password rotation. iron-session will use the highest numbered key for new cookies.
- `cookieName`, **required**: Name of the cookie to be stored
- `ttl`, _optional_: In seconds. Default to the equivalent of 14 days. Setting it to `0` means the seal never expires, which also means it can never be revoked: do not use `0` for authentication.
- `chunk`, _optional_: Split a session that does not fit in one cookie across several cookies. Defaults to `false`. See [Session size](#session-size) before turning it on.
- `onUnsealError`, _optional_: Called when an existing cookie could not be read, with a reason of `"expired"`, `"invalid"` or `"unknown-password"`. The session is reset to empty either way, so this is for logging. See [Watching for unreadable cookies](#watching-for-unreadable-cookies).
- `cookieOptions`, _optional_: Any [Set-Cookie attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#attributes) supported by [jshttp/cookie](https://github.com/jshttp/cookie). Default to:

  ```js
  {
    httpOnly: true,
    secure: true, // set this to false in local (non-HTTPS) development
    sameSite: "lax",// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite#lax
    maxAge: (ttl === 0 ? 2147483647 : ttl) - 60, // Expire cookie before the session expires. A ttl of 60 or less keeps its full value.
    path: "/",
  }
  ```

## API

### `getIronSession<T>(req, res, sessionOptions): Promise<IronSession<T>>`

```ts
type SessionData = {
  // Your data
};

const session = await getIronSession<SessionData>(req, res, sessionOptions);
```

### `getIronSession<T>(cookieStore, sessionOptions): Promise<IronSession<T>>`

```ts
type SessionData = {
  // Your data
};

const session = await getIronSession<SessionData>(cookies(), sessionOptions);
```

### `session.save(): Promise<void>`

Saves the session. This is an asynchronous operation. It must be done and awaited before headers are sent to the client.

```ts
await session.save();
```

### `session.destroy(): void`

Destroys the session. This is a synchronous operation as it only removes the cookie. It must be done before headers are sent to the client.

```ts
session.destroy();
```

`destroy()` is terminal. A `save()` after it is ignored, so a logout handler that calls both still signs the user out. Writing fields back into the session and then saving throws, because the last `Set-Cookie` would win and leave the user signed in.

### `session.updateConfig(sessionOptions: SessionOptions): void`

Updates the configuration of the session with new session options. You still need to call save() if you want them to be applied.

### `sealData(data: unknown, { password, ttl }): Promise<string>`

This is the underlying method and seal mechanism that powers `iron-session`. You can use it to seal any `data` you want and pass it around. One usecase are magic links: you generate a seal that contains a user id to login and send it to a route on your website (like `/magic-login`). Once received, you can safely decode the seal with `unsealData` and log the user in.

### `unsealData<T>(seal: string, { password, ttl }): Promise<T>`

This is the opposite of `sealData` and allow you to decode a seal to get the original data back.

## FAQ

### Why use pure cookies for sessions?

This makes your sessions stateless: since the data is passed around in cookies, you do not need any server or service to store session data.

More information can also be found on the [Ruby On Rails website](https://guides.rubyonrails.org/security.html#session-storage) which uses the same technique.

### How to invalidate sessions?

Sessions cannot be instantly invalidated (or "disconnect this customer") as there is typically no state stored about sessions on the server by default. However, in most applications, the first step upon receiving an authenticated request is to validate the user and their permissions in the database. So, to easily disconnect customers (or invalidate sessions), you can add an `isBlocked`` state in the database and create a UI to block customers.

Then, every time a request is received that involves reading or altering sensitive data, make sure to check this flag.

### Can I use something else than cookies?

Yes, we expose `sealData` and `unsealData` which are not tied to cookies. This way you can seal and unseal any object in your application and move seals around to login users.

### How is this different from [JWT](https://jwt.io/)?

Not so much:

- JWT is a standard, it stores metadata in the JWT token themselves to ensure communication between different systems is flawless.
- JWT tokens are not encrypted, the payload is visible by customers if they manage to inspect the seal. You would have to use [JWE](https://tools.ietf.org/html/rfc7516) to achieve the same.
- @hapi/iron mechanism is not a standard, it's a way to sign and encrypt data into seals

Depending on your own needs and preferences, `iron-session` may or may not fit you.

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
