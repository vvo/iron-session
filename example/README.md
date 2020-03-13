# Example application running with `next-iron-session`

To test locally, clone the repository then:

```bash
cd example
yarn
yarn dev
```

<p align="center"><b>Online demo at <a href="https://next-iron-session.now.sh/">https://next-iron-session.now.sh/</a> 👀</b></p>

## Deploy your own

Deploy the example using [ZEIT Now](https://zeit.co/now):

[![Deploy with ZEIT Now](https://zeit.co/button)](https://zeit.co/import/project?template=https://github.com/vvo/next-iron-session/tree/master/example)

## ⚠️ Always create your own `SECRET_COOKIE_ENCRYPTION_KEY`

This example hardcode the `SECRET_COOKIE_ENCRYPTION_KEY` environment variable used as a `password` to [`withIronSession`](https://github.com/vvo/next-iron-session#withironsessionhandler--password-ttl-cookiename-cookieoptions-) call. But in the real world you should:

1. Generate your own 32 characters minimum `SECRET_COOKIE_ENCRYPTION_KEY` via https://1password.com/password-generator/ for example
2. Store this key in a secrets management system like https://zeit.co/docs/v2/serverless-functions/env-and-secrets
