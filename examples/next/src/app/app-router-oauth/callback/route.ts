import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import {
  basePath,
  oauthStateOptions,
  sessionOptions,
  type OAuthState,
  type SessionData,
} from "../lib";

/**
 * Step 3. The provider sends the visitor back with a `code` and the `state` we
 * gave it. Compare the state against the sealed cookie before trusting the
 * code, then swap the code for a session.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const stateCookie = await getIronSession<OAuthState>(await cookies(), oauthStateOptions);
  const expectedState = stateCookie.state;

  // The state cookie is single use whatever happens next.
  stateCookie.destroy();

  if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
    return Response.redirect(`${url.origin}${basePath}?error=state`, 303);
  }

  // A real provider gets called here to exchange the code for an access token,
  // and then for the user's profile. The example skips the network and treats
  // the code as the profile.
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.username = code.replace(/^code-/, "");
  session.provider = "Example Provider";
  session.isLoggedIn = true;
  await session.save();

  return Response.redirect(`${url.origin}${basePath}`, 303);
}
