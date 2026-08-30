# Migration guide

## v8 to v9

Most apps need two changes: Node 22 and one line if you store a `Date` in the
session. Everything else below is either a type error TypeScript will point at,
or a bug fix you want.

### Requirements

- **Node 22.12 or later.** Node 20 reached end of life in April 2026.
- **The package is ESM-only.** There is no CommonJS build. `require()` still
  works on Node 22.12+, which supports `require()` of an ES module, so most CJS
  code keeps working. If you are bundling for an older target, keep v8.

### Do this

**1. Store timestamps, not `Date` objects.**

```diff
- session.lastSeen = new Date();
+ session.lastSeen = Date.now();
```

v8 quietly turned a `Date` into an ISO string when sealing and handed you back a
string when reading, so the type you wrote out was not the type you got back.
v9 throws with a message naming the fix instead.

**2. Check for missing session data.**

`IronSession<T>` properties are optional on read now, so this stops compiling:

```diff
- const userId = session.user.id;
+ const userId = session.user?.id;
```

A session that does not exist yet is an empty object. The old type claimed
otherwise, so `session.user.id` compiled and threw on a first visit, on an
expired cookie, and after `destroy()`.

**3. Do not write to a session after `destroy()`.**

`destroy()` is terminal now. A bare `save()` after it is ignored, so a logout
handler that calls both keeps working and the user ends up signed out. Writing
fields back in and then saving throws:

```diff
  session.destroy();
- session.lastSeen = Date.now();
- await session.save();
```

Before, that save re-sealed the session and the browser kept the last
`Set-Cookie`, so the logout silently did not happen. A wrapper refreshing a
rolling expiry at the end of every request cancelled every logout in the app.

**4. Pass a real password to `updateConfig()`.**

`updateConfig()` now rebuilds the whole configuration, including the password,
and validates it. Before, a new password passed here was ignored: it kept
sealing with the old one and skipped the 32-character check. If you were
relying on that, you were not rotating anything.

### Nothing to do

- **`getIronSession(req, res, options)` still works.** Express, Connect, plain
  Node and pages-router API routes need no change.
- **`getIronSession(await cookies(), options)` still works**, and now typechecks
  without a cast. If you had `as any` or
  `as unknown as CookieStore` there, delete it.
- **Cookies stay valid.** v9 reads v8 cookies, and v8 reads v9 cookies, so you
  can roll back a deploy without signing everyone out.

### Removed

- **Pre-v8 cookies (iron-session v6 and earlier) are no longer read.** Those
  users sign in once more. The format was selected by a version marker that sat
  outside the seal's signature, which meant an attacker could flip it and
  reshape the session without knowing the password.
- **`createSealData`, `createUnsealData` and `createGetIronSession` are gone.**
  They existed to inject a `crypto` implementation, which is no longer a thing
  anyone needs to pass. Import `sealData`, `unsealData` and `getIronSession`
  directly.
- **`uncrypto` is no longer a dependency.** If you were pinning or aliasing it to
  work around bundler problems, most notably `getRandomValues is not a function`
  under Turbopack, you can drop that.

### New

- **`onUnsealError(reason, error)`** tells you when a cookie could not be read
  and why (`"expired"`, `"invalid"`, `"unknown-password"`). Worth wiring to your
  logger: a burst of `"unknown-password"` means a broken password rotation, and
  a burst of `"invalid"` can mean someone is probing your cookies.
- **`chunk: true`** splits a session that does not fit in one cookie across
  several. Read the size warnings in the README first.
- **Adapters** for the runtimes that needed them:
  - `nextProxyCookies(request, response)` for Next.js `proxy.ts` (called
    `middleware.ts` before Next 16). This is the fix if saving a session in
    Proxy (middleware) never seemed to take effect.
  - `nodeCookies(req, res)` and `webCookies(request, responseOrHeaders)` if you
    want to be explicit instead of relying on the `(req, res, options)` form.

### Rotating a session in Next.js Proxy (middleware)

This did not work before. A cookie written in Proxy (middleware) only reaches the
current render when it goes through `response.cookies.set()`, so `session.save()`
appeared to succeed and then vanished.

```ts
// proxy.ts (middleware.ts before Next 16)
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

## v6 to v8

See the [v8 release notes](https://github.com/vvo/iron-session/releases/tag/v8.0.0).
The short version: `withIronSessionApiRoute` and `withIronSessionSsr` are gone,
call `getIronSession(req, res, options)` directly instead.

Going from v6 straight to v9 works, but those cookies are not readable by v9, so
plan for everyone to sign in once.
