import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";

import { basePath, sessionOptions, type SessionData } from "./lib";

/**
 * The Data Access Layer the Next.js authentication guide describes.
 *
 * Two things it buys:
 *
 * 1. `server-only` makes importing this from a Client Component a build error,
 *    so the session cannot leak into the browser bundle by accident.
 * 2. React's `cache` memoizes it for the render pass, so a page, its layout and
 *    three leaf components can each call `verifySession()` and the cookie is
 *    unsealed once.
 */
export const getSession = cache(async () => {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
});

/**
 * Use this in anything that must not render for a signed-out visitor. It checks
 * next to the data it protects, which is the part `proxy.ts` cannot do safely.
 */
export const verifySession = cache(async () => {
  const session = await getSession();

  if (!session.isLoggedIn || !session.username) {
    redirect(basePath);
  }

  return { username: session.username, lastSeen: session.lastSeen };
});
