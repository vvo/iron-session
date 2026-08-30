# iron-session examples

The app behind [get-iron-session.vercel.app](https://get-iron-session.vercel.app).

## Running it locally

Copy the passwords first, or every session route throws:

```bash
cp .env.example .env.local
```

Then, from the repository root:

```bash
pnpm dev
```

That builds the library, watches it, and serves this app on
**https://iron-session.localhost** through
[portless](https://portless.sh): a real certificate, no port number, and no
`--experimental-https` certificates to manage.

The https matters here. Our cookies default to `secure: true`, and a browser
will not store a `Secure` cookie on an insecure origin. Serving the examples
over plain http means Safari drops the session while Chrome keeps it, which is
exactly the confusion in
[#870](https://github.com/vvo/iron-session/issues/870). With portless the
examples run the same defaults locally that they run in production.

The first run asks for your password once: portless generates a local CA, adds
it to the system trust store, and binds port 443.

## Adding an example

Each example is a folder under `src/app` with its own `lib.ts` holding its
`sessionOptions` and its own cookie name, so one example's session is never
readable by another. Add a card to `src/app/page.tsx` and a test to
`e2e/examples.spec.ts`, which runs against the deployment on every PR.
