
## [9.0.0](https://github.com/vvo/iron-session/compare/v8.0.4...v9.0.0)

See [MIGRATION.md](./MIGRATION.md). Most apps need two changes: Node 22, and one
line if they store a `Date` in the session.

### ⚠ BREAKING CHANGES

* **Node 22.12 or later is required.** Node 20 reached end of life in April 2026.
* **The package is ESM-only.** `require()` still works on Node 22.12+, which
  supports `require()` of an ES module.
* **`Date` values can no longer be stored in a session.** v8 turned them into an
  ISO string when sealing and returned a string when reading, so the type you
  wrote was not the type you got back. Store `Date.now()` instead.
* **`IronSession<T>` properties are optional on read.** A session that does not
  exist yet is an empty object, so the old type let `session.user.id` compile
  and then throw ([#661](https://github.com/vvo/iron-session/issues/661)).
* **Writing to a session after `destroy()` and then saving throws.** A bare
  `save()` after `destroy()` is ignored, so logout handlers that call both keep
  working. Before, that save re-sealed the session and the browser kept the last
  `Set-Cookie`, so the logout silently did not happen.
* **`updateConfig()` validates and applies a new password.** Passing one used to
  be ignored: it kept sealing with the old password and skipped the 32-character
  check.
* **`cookieOptions.expires` in the past is rejected when saving.** A `Date` built
  once at module scope drifts into the past, and the browser then discards every
  cookie. Reading a session never sets a cookie, so reads are unaffected.
* **Pre-v8 cookies are no longer read**, so those users sign in once more. The
  format was chosen by a version marker outside the seal's signature, which made
  it attacker-controlled.
* **`createSealData`, `createUnsealData` and `createGetIronSession` are removed.**
  They existed to inject a `crypto` implementation. Import `sealData`,
  `unsealData` and `getIronSession` directly.
* **`uncrypto` is no longer a dependency.**

### Features

* cookie adapters: `nodeCookies`, `webCookies` and `nextProxyCookies`. The last
  one makes sessions work in Next.js `proxy.ts` / `middleware.ts`, including
  rotation visible to the same request
  ([#887](https://github.com/vvo/iron-session/issues/887),
  [#938](https://github.com/vvo/iron-session/issues/938),
  [#709](https://github.com/vvo/iron-session/issues/709),
  [#684](https://github.com/vvo/iron-session/issues/684))
* `chunk: true` splits a session that does not fit in one cookie across several,
  capped at 4 because the `Cookie` request header is the real limit. Based on the
  approach in [#937](https://github.com/vvo/iron-session/pull/937) by
  @sefasenturk95
* `onUnsealError(reason, error)` reports why a cookie was rejected, as
  `"expired"`, `"invalid"` or `"unknown-password"`. A broken password rotation
  used to be completely silent
* cookie 2 and iron-webcrypto 2
* CI runs the suite on Node 22/24/26, Bun and Deno. Runtime-specific reports were
  previously impossible for us to reproduce
* `SECURITY.md`

### Bug Fixes

* `getIronSession(await cookies(), options)` typechecks without a cast. Our
  `CookieStore.set` was an overload pair while Next declares a single signature
  over a tuple union, so `as any` on the session that guards your
  app was the only thing that worked ([#840](https://github.com/vvo/iron-session/issues/840))
* a `ttl` shorter than the 60s clock skew keeps its full `Max-Age`. It used to
  produce `Max-Age=0` or a negative value, so the browser dropped the cookie on
  arrival while `save()` reported success
* the "not JSON serializable" error names the value it choked on, for example
  `(session.user.lastSeen is a Date)`, instead of leaving you to find it
* an unreadable cookie always starts a fresh session. Two reachable
  iron-webcrypto messages, `Wrong mac prefix` and `Invalid expiration`, escaped
  the old error allowlist and threw a 500 on every request from a browser
  holding that cookie, which is `HttpOnly` so the app could not clear it
* `getRandomValues is not a function` under Turbopack. The runtime always had
  WebCrypto, the bundler resolved the wrong `uncrypto` export condition
  ([#898](https://github.com/vvo/iron-session/issues/898))
* a `ttl` between 1 and 60 produced `Max-Age=0` or a negative value, so the
  browser dropped the cookie on arrival while `save()` reported success
* both calling conventions measure the cookie size the same way, in UTF-8 bytes
  on the real `Set-Cookie` header. One of them used to add up
  `name.length + seal.length + JSON.stringify(options).length`
* the version marker on a seal can no longer select a code path. Flipping `~2` to
  `~1` on a genuine cookie used to reshape the session without the password
* an empty or non-integer-keyed password map fails with a message that says what
  to do, instead of an opaque error from the crypto layer

### Internal

* one session implementation behind a `CookieJar`, replacing two copies of the
  read/save/destroy logic that had drifted apart
* oxlint and oxfmt replace eslint, 6 plugins and prettier. Lint goes from
  seconds to ~0.2s and 12 devDependencies are removed
* typescript 7, tsdown, node's built-in test coverage. turbo and c8 are gone
* CI has `permissions: contents: read`, actions pinned by commit SHA,
  `--frozen-lockfile`, and renovate no longer automerges
* `type-tests/` typechecks against the real `next/headers` and `next/server`
  types, so a Next release breaks our CI instead of a user's build
* coverage on `core.ts` is 97.4%, up from 85.9%. The cookie-store path had no
  tests at all


## [8.0.0-alpha.0](https://github.com/vvo/iron-session/compare/v6.2.1...v8.0.0-alpha.0) (2023-05-27)


### ⚠ BREAKING CHANGES

* rewrite (#574)

### Features

* rewrite ([#574](https://github.com/vvo/iron-session/issues/574)) ([ecdd626](https://github.com/vvo/iron-session/commit/ecdd6260641cd9a61c671fd18a7ef980148ca76a))


### Bug Fixes

* handle ttl and max-age properly in case of overriden options in save/destroy calls ([3c00b13](https://github.com/vvo/iron-session/commit/3c00b1325079c594930fda82157deec3a70d1dd7))