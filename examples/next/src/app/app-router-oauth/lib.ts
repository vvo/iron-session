import type { SessionOptions } from "iron-session";

import { magicLinkPassword, sessionPassword } from "../../passwords";

export const basePath = "/app-router-oauth";

export interface SessionData {
  username: string;
  provider: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  // A getter, so the value is read per request: `next build` collects page
  // data without needing the secret, and a request without it still throws.
  get password() {
    return sessionPassword();
  },
  cookieName: "iron-examples-app-router-oauth",
  cookieOptions: {
    // `secure: true` is the default and stays on in development: `pnpm dev`
    // serves the examples over real https through portless.
    secure: true,
  },
};

/**
 * The short-lived cookie holding the OAuth `state`.
 *
 * Separate from the session on purpose: it exists for the seconds between
 * sending someone to the provider and them coming back, and it must not be
 * readable as a session. Sealed with the link password rather than the session
 * one for the same reason the magic-link token is.
 */
export const oauthStateOptions: SessionOptions = {
  get password() {
    return magicLinkPassword();
  },
  cookieName: "iron-examples-app-router-oauth-state",
  ttl: 10 * 60,
  cookieOptions: {
    // `secure: true` is the default and stays on in development: `pnpm dev`
    // serves the examples over real https through portless.
    secure: true,
    // Written before a redirect to the provider and read on the way back, so a
    // stricter SameSite would drop it on the return trip in some browsers.
    sameSite: "lax",
  },
};

export interface OAuthState {
  state: string;
}
