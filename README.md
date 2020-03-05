# iron-session [![codecov](https://codecov.io/gh/vvo/iron-session/branch/master/graph/badge.svg)](https://codecov.io/gh/vvo/iron-session)

**This JavaScript backend utility** allows you to create a session to then be stored in browser cookies via a signed and encrypted token value. This provides client sessions that are ⚒️ iron-strong.

The token stored on the client contains the session data, not your server, making it a "stateless" session from the server point of view. The token is signed and encrypted using [@hapi/iron](https://github.com/hapijs/iron).

**⚡️ Flash session data is supported**. It means you can store some data which will be deleted when read. This is useful for temporary tokens, redirects or notices on your UI.

**By default the cookie has an ⏰ expiration time of 15 days**, set via [`maxAge`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#Directives). After that, even if someone tries to reuse the cookie, @hapi/iron will not accept the underlying token. Because the expiration is also part of the token value. See https://hapi.dev/family/iron for more information on @hapi/iron mechanisms.

**Why use pure 🍪 cookies for sessions?** This makes your sessions stateless: you do not have to store session data on your server. This is particularly useful in serverless architectures. Still, there are some drawbacks to this approach:

- you cannot invalidate a cookie when needed because there's no state stored on the server-side about the tokens. We consider that the way the cookie is stored reduces the possibility for this eventuality to happen.
- application not supporting cookies won't work, this could be solved in the future by exposing the underlying token instead of signed and encrypted cookies. Open an issue if you're interested.
- on most browsers, you're limited to 4,096 bytes per cookie. To give you an idea, an `iron-session` containing `{user: {id: 230, admin: true}}` is 358 bytes signed and encrypted: still plenty of available cookie space in here.

Now that you know the drawbacks, you can decide if they are an issue for your application or not.

**🤓 References:**

- https://owasp.org/www-project-cheat-sheets/cheatsheets/Session_Management_Cheat_Sheet.html#cookies
- https://owasp.org/www-project-cheat-sheets/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#encryption-based-token-pattern

## How is this different from [JWT](https://jwt.io/)?

Not so much:

- JWT is a standard, it stores metadata in the JWT token themselves to ensure communication between different systems is flawless.
- JWT tokens are not encrypted, the payload is visible by customers if they manage to inspect the token. You would have to use [JWE](https://tools.ietf.org/html/rfc7516) to achieve the same.
- @hapi/iron mechanism is not a standard, it's a way to sign and encrypt data into tokens

Depending on your own needs and preferences, `iron-session-cookie` may or may not fit you.

## Instalation

```bash
npm add iron-session
```

## Usage

The examples are using a user login flow: login, verify, log out. But you can use `iron-session` for any other session need.

The password is a private key you must pass at runtime, it has to be at least 32 characters long. https://1password.com/password-generator/ is a good way to generate a strong password.

### When the user logs in

```js
import { createSession } from "iron-session";
export default async (req, res) => {
  // when user successfully logs in using email/password, oauth, ... then we create a session
  // const user = ...

  const session = await createSession({
    password: process.env.SECRET_SESSION_PASSWORD
  });

  session.set({ name: "user", value: { id: 230, admin: true } });
  session.set({ name: "message", value: "Login success", flash: true });

  res.writeHead(200, {
    "set-cookie": await session.serializeCookie()
  });

  res.end("ok");
};
```

`serializeCookie` accepts all the options from https://github.com/jshttp/cookie#cookieserializename-value-options, merged with `iron-session` defaults. The defaults are:

```js
{
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: (ttl === 0 ? 2147483647 : ttl) - 60, // For Iron, ttl 0 means it will never expire. For browser cookies, maxAge 0 means it will expire immediately. WhilCookie must expire before the seal, otherwise you could have expired seals stored in a cookie
}
```

### Checking if the user is logged in

```js
import { getSession, parseCookie } from "iron-session";
export default async (req, res) => {
  const session = await getSession({
    password: process.env.SECRET_SESSION_PASSWORD,
    sealed: parseCookie({ cookie: req.getHeader("cookie") })
  });

  const user = session.get({ name: "user" });
  const flashMessage = session.get({ name: "message" });

  res.end("ok");
};
```

### When the user logs out

```js
import { deleteCookie } from "iron-session";
export default async (req, res) => {
  res.writeHead(200, {
    "set-cookie": deleteCookie()
  });

  res.end("ok");
};
```

## Project status

This is a recent library I authored because I needed it. While @hapi/iron is battle-tested and [used in production on a lot of websites](https://hapi.dev/), this library is not. Use it at your own risk.

If you find bugs or have API ideas, create an issue.
