# Security policy

## Reporting a vulnerability

Please report security issues privately through
[GitHub Security Advisories](https://github.com/vvo/iron-session/security/advisories/new).
Do not open a public issue for a vulnerability.

You should get a first reply within a week. If you do not hear back, email
vincent@codeagain.com with "iron-session security" in the subject.

Please include the version you tested, a description of the impact, and a
reproduction if you have one.

## Supported versions

| Version | Supported           |
| ------- | ------------------- |
| 9.x     | Yes                 |
| 8.x     | Security fixes only |
| < 8     | No                  |

## What iron-session protects

Session data is encrypted and signed with
[iron-webcrypto](https://github.com/brc-dd/iron-webcrypto) (AES-256-CBC for
confidentiality, HMAC-SHA-256 for integrity) and stored in a cookie. Given your
password stays secret, a client cannot read the session contents and cannot
modify them without the change being detected.

## What it does not protect

These are properties of stateless sessions, not bugs. Design around them.

- **No server-side revocation.** A sealed cookie is valid until it expires.
  Signing a user out clears their cookie, it does not invalidate a copy that was
  already captured. If you need immediate revocation, keep a short `ttl` and
  check a server-side value (a token version, a "sessions valid after"
  timestamp) on requests that matter.
- **`ttl: 0` means forever.** The seal carries no expiration, so it is accepted
  indefinitely. Do not use it for authentication.
- **Shortening `ttl` does not affect issued cookies.** Expiration is written into
  the seal when it is created. Cookies already in the wild keep their original
  lifetime.
- **The cookie is a bearer token.** Anyone holding it is the user. Keep
  `httpOnly` and `secure` on, which is the default.
- **Password strength is on you.** The key derivation does not stretch the
  password, so a guessable 32-character password is weak. Generate a random one:
  `openssl rand -base64 32`.
- **A seal is not bound to a user or a device.** iron-session verifies that the
  contents are authentic, not that the right person is presenting them.

## Password rotation

Pass a map, keyed by number. The highest key encrypts, every key can decrypt:

```ts
password: { 2: process.env.NEW_PASSWORD, 1: process.env.OLD_PASSWORD }
```

Keep the old password until every cookie sealed with it has expired (at least
your `ttl`), then drop it. Removing it too early signs those users out. Watch
`onUnsealError` for `"unknown-password"` to catch a rotation you got wrong.

## Handling unreadable cookies

When a cookie cannot be read, iron-session starts a new empty session instead of
throwing. A stateless library cannot tell tampering from a rotation mistake or an
expired seal, and a 500 on every request would be worse. That makes real problems
invisible, so log them:

```ts
onUnsealError: (reason, error) => {
  if (reason !== "expired") {
    logger.warn({ reason, error }, "session cookie rejected");
  }
};
```

A burst of `"invalid"` can mean someone is probing your cookies. A burst of
`"unknown-password"` usually means a broken rotation.

## Supply chain

Releases are published from CI with
[npm provenance](https://docs.npmjs.com/generating-provenance-statements), so you
can verify a tarball was built from this repository. CI workflows pin actions by
commit SHA and run with read-only permissions. Dependency updates are never
merged automatically.
