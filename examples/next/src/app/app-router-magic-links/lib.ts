import type { SessionOptions } from "iron-session";

import { magicLinkPassword, sessionPassword } from "../../passwords";

export interface SessionData {
  username: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  // A getter, so the value is read per request: `next build` collects page
  // data without needing the secret, and a request without it still throws.
  get password() {
    return sessionPassword();
  },
  cookieName: "iron-examples-app-router-magic-links",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export const basePath = "/app-router-magic-links";

export const fifteenMinutesInSeconds = 15 * 60;

/**
 * Sealing options for the magic-link token in the URL.
 *
 * A different password from the session on purpose. Both used to share one, so a
 * link token was a valid session cookie and a session cookie was a valid link
 * token. Magic links travel through email, referrer headers and chat previews,
 * so they must not be able to stand in for a session.
 */
export const magicLinkTokenOptions = {
  get password() {
    return magicLinkPassword();
  },
  ttl: fifteenMinutesInSeconds,
};
