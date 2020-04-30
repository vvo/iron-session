# next-iron-session [![GitHub license](https://img.shields.io/github/license/vvo/next-iron-session?style=flat)](https://github.com/vvo/next-iron-session/blob/master/LICENSE) [![Tests](https://github.com/vvo/next-iron-session/workflows/Tests/badge.svg)](https://github.com/vvo/next-iron-session/actions) [![codecov](https://codecov.io/gh/vvo/next-iron-session/branch/master/graph/badge.svg)](https://codecov.io/gh/vvo/next-iron-session) ![npm](https://img.shields.io/npm/v/next-iron-session)

_🛠 Next.js stateless session utility using signed and encrypted cookies to store data_

---

**This [Next.js](https://nextjs.org/) backend utility** allows you to create a session to then be stored in browser cookies via a signed and encrypted seal. This provides client sessions that are ⚒️ iron-strong.

The seal stored on the client contains the session data, not your server, making it a "stateless" session from the server point of view. This is a different take than [next-session](https://github.com/hoangvvo/next-session/) where the cookie contains a session ID to then be used to map data on the server-side.

<p align="center"><b>Online demo at <a href="https://next-iron-session.now.sh/">https://next-iron-session.now.sh/</a> 👀</b></p>

---

The seal is signed and encrypted using [@hapi/iron](https://github.com/hapijs/iron), [iron-store](https://github.com/vvo/iron-store/) is used behind the scenes.
This method of storing session data is the same technique used by **frameworks like [Ruby On Rails](https://guides.rubyonrails.org/security.html#session-storage)**.

**⚡️ Flash session data is supported**. It means you can store some data which will be deleted when read. This is useful for temporary data, redirects or notices on your UI.

**♻️ Password rotation is supported**. It allows you to change the password used to sign and encrypt sessions while still being able to decrypt sessions that were created with a previous password.

**By default the cookie has an ⏰ expiration time of 15 days**, set via [`maxAge`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#Directives). After that, even if someone tries to reuse the cookie, `next-iron-session` will not accept the underlying seal because the expiration is part of the seal value. See https://hapi.dev/family/iron for more information on @hapi/iron mechanisms.

**Next.js's** 🗿 [Static generation](https://nextjs.org/docs/basic-features/pages#static-generation-recommended) (SG) and ⚙️ [Server-side Rendering](https://nextjs.org/docs/basic-features/pages#server-side-rendering) (SSG) are both supported.

_Table of contents:_

- [Installation](#installation)
- [Usage](#usage)
- [Examples](#examples)
  - [Handle password rotation/update the password](#handle-password-rotationupdate-the-password)
- [API](#api)
  - [withIronSession(handler, { password, cookieName, [ttl], [cookieOptions] })](#withironsessionhandler--password-cookiename-ttl-cookieoptions-)
  - [req.session.set(name, value)](#reqsessionsetname-value)
  - [req.session.get(name)](#reqsessiongetname)
  - [req.session.setFlash(name, value)](#reqsessionsetflashname-value)
  - [req.session.unset(name)](#reqsessionunsetname)
  - [req.session.destroy()](#reqsessiondestroy)
- [FAQ](#faq)
  - [Why use pure 🍪 cookies for sessions?](#why-use-pure--cookies-for-sessions)
  - [How is this different from JWT?](#how-is-this-different-from-jwt)
- [Project status](#project-status)
- [🤓 References](#-references)

## Installation

```bash
npm add next-iron-session
```

## Usage

You can find a more complete real-world example in the [example folder](./example/).

The password is a private key you must pass at runtime, it has to be at least 32 characters long. Use https://1password.com/password-generator/ to generate strong passwords.

⚠️ Always store passwords in secret environment variables on your platform.

**pages/api/login.js**:

```js
import withIronSession from "iron-session";

async function handler(req, res) {
  // get user from database then:
  req.session.set("user", {
    id: 230,
    admin: true,
  });
  await req.session.save();
  res.send("Logged in");
}

export default withIronSession(handler, {
  password: "complex_password_at_least_32_characters_long",
});
```

**pages/user.js**:

```js
import withIronSession from "iron-session";

function handler(req, res, session) {
  const user = req.session.get("user");
  res.send({ user });
}

export default withIronSession(handler, {
  password: "complex_password_at_least_32_characters_long",
});
```

**pages/api/logout.js**:

```js
import withIronSession from "iron-session";

function handler(req, res, session) {
  req.session.destroy();
  res.send("Logged out");
}

export default withIronSession(handler, {
  password: "complex_password_at_least_32_characters_long",
});
```

## Examples

### Handle password rotation/update the password

When you want to:

- rotate passwords for better security every two (or more, or less) weeks
- change the password you previously used because it leaked somewhere (😱)

Then you can use multiple passwords:

**Week 1**:

```js
export default withIronSession(handler, {
  password: [
    {
      id: 1,
      password: "complex_password_at_least_32_characters_long",
    },
  ],
});
```

**Week 2**:

```js
export default withIronSession(handler, {
  password: [
    {
      id: 2,
      password: "another_password_at_least_32_characters_long",
    },
    {
      id: 1,
      password: "complex_password_at_least_32_characters_long",
    },
  ],
});
```

Notes:

- `id` is required so that we do not have to try every password in the list when decrypting (the `id` is part of the cookie value).
- The password used to encrypt session data (to `seal`) is always the first one in the array, so when rotating to put a new password, it must be first in the array list
- Even if you do not provide an array at first, you can always move to array based passwords afterwards, knowing that your first password (`string`) was given `{id:1}` automatically.

## API

### withIronSession(handler, { password, cookieName, [ttl], [cookieOptions] })

- `password`, **required**: Private key used to encrypt the cookie. It has to be at least 32 characters long. Use https://1password.com/password-generator/ to generate strong passwords. `password` can be either a `string` or an `array` of objects like this: `[{id: 2, password: "..."}, {id: 1, password: "..."}]` to allow for password rotation.
- `cookieName`, **required**: Name of the cookie to be stored
- `ttl`, _optional_: In seconds, default to 14 days
- `cookieOptions`, _optional_: Any option available from [jshttp/cookie#serialize](https://github.com/jshttp/cookie#cookieserializename-value-options). Default to:

```js
{
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  // The next line makes sure browser will expire cookies before seals are considered expired by the server. It also allows for clock difference of 60 seconds maximum between server and clients.
  maxAge: (ttl === 0 ? 2147483647 : ttl) - 60,
  path: "/",
}
```

### req.session.set(name, value)

### req.session.get(name)

### req.session.setFlash(name, value)

### req.session.unset(name)

### req.session.destroy()

## FAQ

### Why use pure 🍪 cookies for sessions?

This makes your sessions stateless: you do not have to store session data on your server. This is particularly useful in serverless architectures. Still, there are some drawbacks to this approach:

- you cannot invalidate a seal when needed because there's no state stored on the server-side about them. We consider that the way the cookie is stored reduces the possibility for this eventuality to happen.
- application not supporting cookies won't work, but you can use [iron-store](https://github.com/vvo/iron-store/) to implement something similar. In the future, we could allow `next-iron-session` to accept [basic auth](https://tools.ietf.org/html/rfc7617) or bearer token methods too. Open an issue if you're interested.
- on most browsers, you're limited to 4,096 bytes per cookie. To give you an idea, a `next-iron-session` cookie containing `{user: {id: 230, admin: true}}` is 358 bytes signed and encrypted: still plenty of available cookie space in here.
- performance: crypto on the server-side could be slow, if that's the case let me know. Also, cookies are sent to every request to your website, even images, so this could be an issue

Now that you know the drawbacks, you can decide if they are an issue for your application or not.
More information can also be found on the [Ruby On Rails website](https://guides.rubyonrails.org/security.html#session-storage) which uses the same technique.

### How is this different from [JWT](https://jwt.io/)?

Not so much:

- JWT is a standard, it stores metadata in the JWT token themselves to ensure communication between different systems is flawless.
- JWT tokens are not encrypted, the payload is visible by customers if they manage to inspect the seal. You would have to use [JWE](https://tools.ietf.org/html/rfc7516) to achieve the same.
- @hapi/iron mechanism is not a standard, it's a way to sign and encrypt data into seals

Depending on your own needs and preferences, `next-iron-session-cookie` may or may not fit you.

## Project status

This is a recent library I authored because I needed it. While @hapi/iron is battle-tested and [used in production on a lot of websites](https://hapi.dev/), this library is not (yet!). Please use it at your own risk.

If you find bugs or have API ideas, [create an issue](https://github.com/vvo/next-iron-session/issues).

## 🤓 References

- https://owasp.org/www-project-cheat-sheets/cheatsheets/Session_Management_Cheat_Sheet.html#cookies
- https://owasp.org/www-project-cheat-sheets/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#encryption-based-seal-pattern
