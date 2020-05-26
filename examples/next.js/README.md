# Example Next.js application using [`next-iron-session`](https://github.com/vvo/next-iron-session)

This example creates an authentication system that uses a **signed and encrypted cookie to store session data**. It relies on [`next-iron-session`](https://github.com/vvo/next-iron-session).

It uses current best practices for authentication in the Next.js ecosystem.

**Features:**

- [Static Generation](https://nextjs.org/docs/basic-features/pages#static-generation-recommended) (SG), recommended example
- [Server-side Rendering](https://nextjs.org/docs/basic-features/pages#server-side-rendering) (SSR) example in case you need it
- Logged in status synchronized between browser windows/tabs using **`withUser`** hook and [`swr`](https://swr.now.sh/) module
- Layout based on logged-in status
- Session data is signed and encrypted in a cookie

This example creates an authentication system that uses a **signed and encrypted cookie to store session data**. It relies on [`next-iron-session`](https://github.com/vvo/next-iron-session).

It uses current best practices for authentication in the Next.js ecosystem.

**Features:**

- [Static Generation](https://nextjs.org/docs/basic-features/pages#static-generation-recommended) (SG), recommended example
- [Server-side Rendering](https://nextjs.org/docs/basic-features/pages#server-side-rendering) (SSR) example in case you need it
- Logged in status synchronized between browser windows/tabs using **`withUser`** hook and [`swr`](https://swr.now.sh/) module
- Layout based on the user's logged-in/out status
- Session data is signed and encrypted in a cookie

---

<p align="center"><b>Online demo at <a href="https://next-iron-session.now.sh/">https://next-iron-session.now.sh/</a> 👀</b></p>

---

## Deploy your own

Deploy the example using [ZEIT Now](https://zeit.co/now):

[![Deploy with ZEIT Now](https://zeit.co/button)](https://zeit.co/import/project?template=https://github.com/vvo/next-iron-session/tree/master/example)

## ⚠️ Always create your own `SECRET_COOKIE_PASSWORD`

This example hardcode the `SECRET_COOKIE_PASSWORD` environment variable used as a `password` to [`withIronSession`](https://github.com/vvo/next-iron-session#withironsessionhandler--password-ttl-cookiename-cookieoptions-) call. But in the real world you should:

1. Generate your own 32 characters minimum `SECRET_COOKIE_PASSWORD` via https://1password.com/password-generator/ for example
2. Store this key in a secrets management system like https://zeit.co/docs/v2/serverless-functions/env-and-secrets
