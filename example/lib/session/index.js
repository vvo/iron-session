import withIronSession from "next-iron-session";
// see `now.json` for the secret cookie encryption key
// ⚠️ Do not reuse the same key, create a different key for you
// Store the key in a secret management system, example for Zeit's now:
// https://zeit.co/docs/v2/serverless-functions/env-and-secrets
const cookieEncryptionKey = process.env.SECRET_COOKIE_ENCRYPTION_KEY;

export default function withSession(handler) {
  return withIronSession(handler, {
    password: cookieEncryptionKey,
    cookieOptions: {
      // the next line allows to use the session in non-https environements like
      // Next.js dev mode (http://localhost:3000)
      secure: process.env.NODE_ENV === "production" ? true : false
    }
  });
}
