# iron-session [![GitHub license](https://img.shields.io/github/license/vvo/iron-session?style=flat)](https://github.com/vvo/iron-session/blob/master/LICENSE) [![npm](https://img.shields.io/npm/v/iron-session)](https://www.npmjs.com/package/iron-session) [![Downloads](https://img.shields.io/npm/dm/next-iron-session.svg)](http://npm-stat.com/charts.html?package=iron-session)

**`iron-session` is a secure, stateless, and cookie-based session library for JavaScript.**

The session data is stored in signed and encrypted cookies which are decoded by your server code in a stateless fashion (= no I/O involved). This is the same technique used by frameworks like
[Ruby On Rails](https://guides.rubyonrails.org/security.html#session-storage).

<p align="center"><i>⭐️ Featured in the <a href="https://nextjs.org/docs/authentication">Next.js documentation</a></i></p>

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Usage](#usage)
- [Session options](#session-options)
- [API](#api)
  - [`getIronSession<T>(req, res, sessionOptions): Promise<IronSession<T>>`](#getironsessiontreq-res-sessionoptions-promiseironsessiont)
  - [`getIronSession<T>(cookieStore, sessionOptions): Promise<IronSession<T>>`](#getironsessiontcookiestore-sessionoptions-promiseironsessiont)
  - [session.save()](#sessionsave)
  - [session.destroy()](#sessiondestroy)
- [Credits](#credits)
- [Good Reads](#good-reads)

## Installation

```sh
pnpm add iron-session
```

## Usage

To get a session, there's a single method to know: `getIronSession`.

```ts
// Next.js Pages with API Route and Node.js/Express/Connect.
import { getIronSession } from 'iron-session';

export function get(req, res) {
  const session = getIronSession(req, res, { password: "...", cookieName: "..." });
}

export function post(req, res) {
  const session = getIronSession(req, res, { password: "...", cookieName: "..." });
  session.username = "Alison";
  await session.save();
}
```

```ts
// Next.js App Router with route handlers
import { cookies } from 'next/header';
import { getIronSession } from 'iron-session';

export function GET() {
  const session = getIronSession(cookies(), { password: "...", cookieName: "..." });
}

export function POST() {
  const session = getIronSession(req, res, { password: "...", cookieName: "..." });
  session.username = "Alison";
  await session.save();
}
```

```ts
// Next.js App Router with server component or server action
import { cookies } from 'next/header';
import { getIronSession } from 'iron-session';

async function getIronSession() {
  const session = await getIronSession(cookies(), { password: "...", cookieName: "..." });
}

function Profile() {
  const session = await getIronSession();

  return <div>{session.username}</div>;
}
```


## Session options

Two options are required: `password` and `cookieName`. Everything else is automatically computed and usually doesn't need to be changed.

- `password`, **required**: Private key used to encrypt the cookie. It has to be at least 32 characters long. Use <https://1password.com/password-generator/> to generate strong passwords. `password` can be either a `string` or an `array` of objects like this: `[{id: 2, password: "..."}, {id: 1, password: "..."}]` to allow for password rotation.
- `cookieName`, **required**: Name of the cookie to be stored
- `ttl`, _optional_: In seconds. Default to the equivalent of 14 days. You can set this to `0` and iron-session will compute the maximum allowed value by cookies.
- `cookieOptions`, _optional_: Any option available from [jshttp/cookie#serialize](https://github.com/jshttp/cookie#cookieserializename-value-options) except for `encode` which is not a Set-Cookie Attribute. See [Mozilla Set-Cookie Attributes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#attributes) and [Chrome Cookie Fields](https://developer.chrome.com/docs/devtools/application/cookies/#fields). Default to:

  ```js
  {
    httpOnly: true,
    secure: true, // set this to false in local (non-HTTPS) development
    sameSite: "lax",// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite#lax
    maxAge: (ttl === 0 ? 2147483647 : ttl) - 60, // Expire cookie before the session expires.
    path: "/",
  }
  ```

## API

### `getIronSession<T>(req, res, sessionOptions): Promise<IronSession<T>>`

```ts
const session = getIronSession<SessionData>(req, res, sessionOptions);
```

### `getIronSession<T>(cookieStore, sessionOptions): Promise<IronSession<T>>`

```ts
const session = getIronSession<SessionData>(cookies(), sessionOptions);
```

### session.save()

Saves the session.

```ts
await session.save()
```

### session.destroy()

Destroys the session.

```ts
await session.destroy()
```

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
