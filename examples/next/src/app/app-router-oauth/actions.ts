"use server";

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requestOrigin } from "../../request-origin";
import {
  basePath,
  oauthStateOptions,
  sessionOptions,
  type OAuthState,
  type SessionData,
} from "./lib";

/**
 * Step 1. Mint a random `state`, keep it in a sealed cookie, then send the
 * visitor to the provider with the same value in the URL.
 *
 * The state is what stops a login CSRF: without it, someone can hand you a
 * callback URL carrying their own code and log your browser into their account.
 */
export async function startLogin(): Promise<never> {
  const state = crypto.randomUUID();

  const stateCookie = await getIronSession<OAuthState>(await cookies(), oauthStateOptions);
  stateCookie.state = state;
  await stateCookie.save();

  // A real provider needs an absolute redirect_uri, and reading the origin off
  // the request means preview deployments work without configuring a URL.
  const origin = await requestOrigin();

  const authorize = new URL(`${origin}${basePath}/provider`);
  authorize.searchParams.set("client_id", "iron-session-example");
  authorize.searchParams.set("redirect_uri", `${origin}${basePath}/callback`);
  authorize.searchParams.set("state", state);

  redirect(authorize.toString());
}

export async function logout(): Promise<void> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  session.destroy();
  revalidatePath(basePath);
}
