# next-iron-session [![GitHub license](https://img.shields.io/github/license/vvo/next-iron-session?style=flat)](https://github.com/vvo/next-iron-session/blob/master/LICENSE) ![Tests](https://github.com/vvo/next-iron-session/workflows/Tests/badge.svg) [![codecov](https://codecov.io/gh/vvo/next-iron-session/branch/master/graph/badge.svg)](https://codecov.io/gh/vvo/next-iron-session) ![npm](https://img.shields.io/npm/v/next-iron-session)

_🛠 Next.js stateless session utility using signed and encrypted cookies to store data_

---

**This [Next.js](https://nextjs.org/) backend utility** allows you to create a session to then be stored in browser cookies via a signed and encrypted seal. This provides client sessions that are ⚒️ iron-strong.

The seal stored on the client contains the session data, not your server, making it a "stateless" session from the server point of view. This is a different take than [next-session](https://github.com/hoangvvo/next-session/) where the cookie contains a session ID to then be used to identity data on the server-side.

The seal is signed and encrypted using [@hapi/iron](https://github.com/hapijs/iron), [iron-store](https://github.com/vvo/iron-store/) is used behind the scenes.

**⚡️ Flash session data is supported**. It means you can store some data which will be deleted when read. This is useful for temporary data, redirects or notices on your UI.

**By default the cookie has an ⏰ expiration time of 15 days**, set via [`maxAge`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#Directives). After that, even if someone tries to reuse the cookie, `next-iron-session` will not accept the underlying seal because the expiration is part of the seal value. See https://hapi.dev/family/iron for more information on @hapi/iron mechanisms.

## Installation

```bash
npm add next-iron-session
```

## Usage

The password is a private key you must pass at runtime, it has to be at least 32 characters long. Use https://1password.com/password-generator/ to generate strong passwords.

Store passwords in secret environment variables on your platform.

**login.js**:

```js
import withIronSession from "iron-session";

async function handler(req, res, session) {
  session.set("user", {
    id: 230,
    admin: true
  });
  await session.save();
  res.send("Logged in");
}

export default withIronSession(handler, {
  password: "complex_password_at_least_32_characters_long"
});
```

**user.js**:

```js
import withIronSession from "iron-session";

function handler(req, res, session) {
  const user = session.get("user");
  res.send({ user });
}

export default withIronSession(handler, {
  password: "complex_password_at_least_32_characters_long"
});
```

**logout.js**:

```js
import withIronSession from "iron-session";

function handler(req, res, session) {
  session.destroy();
  res.send("Logged out");
}

export default withIronSession(handler, {
  password: "complex_password_at_least_32_characters_long"
});
```

## API

### withIronSession(handler, {password, ttl, cookieName, cookieOptions})

### session.set

### session.get

### session.setFlash

### session.destroy

## FAQ

### Why use pure 🍪 cookies for sessions?

This makes your sessions stateless: you do not have to store session data on your server. This is particularly useful in serverless architectures. Still, there are some drawbacks to this approach:

- you cannot invalidate a seal when needed because there's no state stored on the server-side about them. We consider that the way the cookie is stored reduces the possibility for this eventuality to happen.
- application not supporting cookies won't work, but you can use [iron-store](https://github.com/vvo/iron-store/) to implement something similar. In the future we could allow `next-iron-session` to accept [basic auth](https://tools.ietf.org/html/rfc7617) or bearer token methods too. Open an issue if you're interested.
- on most browsers, you're limited to 4,096 bytes per cookie. To give you an idea, a `next-iron-session` cookie containing `{user: {id: 230, admin: true}}` is 358 bytes signed and encrypted: still plenty of available cookie space in here.

Now that you know the drawbacks, you can decide if they are an issue for your application or not.

### How is this different from [JWT](https://jwt.io/)?

Not so much:

- JWT is a standard, it stores metadata in the JWT seal themselves to ensure communication between different systems is flawless.
- JWT seals are not encrypted, the payload is visible by customers if they manage to inspect the seal. You would have to use [JWE](https://tools.ietf.org/html/rfc7516) to achieve the same.
- @hapi/iron mechanism is not a standard, it's a way to sign and encrypt data into seals

Depending on your own needs and preferences, `next-iron-session-cookie` may or may not fit you.

## Project status

This is a recent library I authored because I needed it. While @hapi/iron is battle-tested and [used in production on a lot of websites](https://hapi.dev/), this library is not. Please use it at your own risk.

If you find bugs or have API ideas, create an issue.

## 🤓 References

- https://owasp.org/www-project-cheat-sheets/cheatsheets/Session_Management_Cheat_Sheet.html#cookies
- https://owasp.org/www-project-cheat-sheets/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#encryption-based-seal-pattern
