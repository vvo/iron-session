import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";

import { sessionOptions, type SessionData } from "./lib";

export const basePath = "/app-router-server-component-and-action";

/**
 * The Data Access Layer from the Next.js authentication guide.
 *
 * `server-only` turns importing this from a Client Component into a build
 * error, and React's `cache` unseals the cookie once per render however many
 * components ask for it.
 */
export const readSession = cache(async () => {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
});

/** Redirects a signed-out visitor. Call it wherever the data needs protecting. */
export const verifySession = cache(async () => {
  const session = await readSession();

  if (!session.isLoggedIn || !session.username) {
    redirect(basePath);
  }

  return { username: session.username };
});
