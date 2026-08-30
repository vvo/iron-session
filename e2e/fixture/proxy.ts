import { NextResponse, type NextRequest } from "next/server";
import { getIronSession, nextProxyCookies } from "iron-session";

import { options, type Session } from "./session";

/**
 * Rotation in the middleware layer, which is what #887, #709, #684 and #938 were
 * all about.
 *
 * The adapter matters here. Next only merges a cookie set in middleware into the
 * current render when it goes through `response.cookies.set()`, and writing to
 * `request.cookies` is what makes the new value visible to the page rendering in
 * this same request. Appending a raw `set-cookie` header, which is what
 * `session.save()` used to do, looked like it worked and had no effect.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  const session = await getIronSession<Session>(nextProxyCookies(request, response), options);

  // Only touch an existing session, so an anonymous visitor stays cookie-free.
  if (session.username) {
    session.lastSeen = Date.now();
    await session.save();
  }

  return response;
}

export const config = { matcher: ["/", "/other"] };
