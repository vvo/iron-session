import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export interface Session {
  username: string;
  visits: number;
  blob: string;
  /** Written by proxy.ts on every request, to test rotation. */
  lastSeen: number;
}

export const cookieName = "e2e-session";

export const options: SessionOptions = {
  cookieName,
  password: "e2e_password_that_is_at_least_32_chars",
  // The fixture runs over plain http, and a browser will not store a `Secure`
  // cookie on an insecure origin. Every other default is left alone.
  cookieOptions: { secure: false },
};

// A separate cookie name so the chunking tests cannot interfere with the
// login/logout/proxy tests, which run in parallel.
export const chunkedCookieName = "e2e-chunked";

export const chunkedOptions: SessionOptions = {
  ...options,
  cookieName: chunkedCookieName,
  chunk: true,
};

export async function getSession(sessionOptions: SessionOptions = options) {
  return getIronSession<Session>(await cookies(), sessionOptions);
}

/**
 * The default configuration, `secure: true`, served over plain http.
 *
 * This is what #870 most likely was. Browsers disagree about whether a `Secure`
 * cookie may be stored on an insecure origin, and localhost is a special case
 * that some treat as trustworthy and some do not. The e2e suite asserts what
 * each engine actually does rather than guessing.
 */
export const secureCookieName = "e2e-secure";

export const secureOptions: SessionOptions = {
  cookieName: secureCookieName,
  password: options.password,
};
