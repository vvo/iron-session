import { getIronSession, nextProxyCookies, type SessionOptions } from "iron-session";
import { NextResponse, type NextRequest } from "next/server";

import { sessionOptions as appRouterClientComponentRouteHandlerSwrIronOptions } from "./app/app-router-client-component-route-handler-swr/lib";
import {
  basePath as cacheComponentsBasePath,
  sessionOptions as cacheComponentsSessionOptions,
} from "./app/app-router-cache-components/lib";
import { sessionOptions as pagesRouterApiRouteSwrIronOptions } from "./pages-components/pages-router-api-route-swr/lib";

// Only here for the multi examples demo, in your app this would be imported from elsewhere
interface SessionData {
  username: string;
  isLoggedIn: boolean;
  lastSeen: number;
}

const sessionOptions: Record<string, SessionOptions> = {
  "/app-router-client-component-route-handler-swr/protected-middleware":
    appRouterClientComponentRouteHandlerSwrIronOptions,
  "/pages-router-api-route-swr/protected-middleware": pagesRouterApiRouteSwrIronOptions,
};

/**
 * This file was `middleware.ts` before Next.js 16.
 *
 * Two things worth copying from here:
 *
 * 1. It reads the session through `nextProxyCookies(request, response)`, not
 *    through `cookies()` from `next/headers`. Writing a cookie here only reaches
 *    the current render when it goes through `response.cookies.set()`, which is
 *    what the adapter does, so `session.save()` in this layer actually takes
 *    effect. It also writes to `request.cookies`, which is what makes a value
 *    set here visible to the page rendering in the same request.
 *
 * 2. The redirect below is a convenience, not the security boundary. The
 *    protected pages read the session themselves. Do not rely on this file to
 *    keep people out: it is one config change away from not running, and
 *    CVE-2025-29927 was a Next.js bug that let requests skip it entirely.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === cacheComponentsBasePath) {
    return rotate(request);
  }

  const options = sessionOptions[request.nextUrl.pathname];

  if (!options) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(nextProxyCookies(request, response), options);

  if (!session.isLoggedIn) {
    const redirectTo = request.nextUrl.pathname.split("/protected-middleware")[0];

    return NextResponse.redirect(`${request.nextUrl.origin}${redirectTo}`, 302);
  }

  return response;
}

/**
 * Writing to the session from this layer, which is the part people get wrong.
 *
 * `session.save()` here goes through `response.cookies.set()` and through
 * `request.cookies`, so the page rendering this same request reads the value
 * written just above. The page is partially prerendered, and this still works:
 * the session panel is a dynamic hole, so it runs after this file did.
 */
async function rotate(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    nextProxyCookies(request, response),
    cacheComponentsSessionOptions,
  );

  // Only touch an existing session, so an anonymous visitor stays cookie-free.
  if (session.isLoggedIn) {
    session.lastSeen = Date.now();
    await session.save();
  }

  return response;
}

// See "Matching Paths" below to learn more. These have to be literals: Next
// reads this config statically, so it cannot be built from an imported const.
export const config = {
  matcher: ["/:path+/protected-middleware", "/app-router-cache-components"],
};
