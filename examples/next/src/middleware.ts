import type { NextRequest } from "next/server";

import { sessionOptions as appRouterClientComponentRouteHandlerSwrIronOptions } from "./app/app-router-client-component-route-handler-swr/lib";
import { sessionOptions as pagesRouterApiRouteSwrIronOptions } from "./pages-components/pages-router-api-route-swr/lib";
import { cookies } from "next/headers";
import { SessionOptions, getIronSession } from "iron-session";

// Only here for the multi examples demo, in your app this would be imported from elsewhere
interface SessionData {
  username: string;
  isLoggedIn: boolean;
}

const sessionOptions: Record<string, SessionOptions> = {
  "/app-router-client-component-route-handler-swr/protected-middleware":
    appRouterClientComponentRouteHandlerSwrIronOptions,
  "/pages-router-api-route-swr/protected-middleware":
    pagesRouterApiRouteSwrIronOptions,
};

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const session = await getIronSession<SessionData>(
    cookies(),
    sessionOptions[request.nextUrl.pathname],
  );

  if (!session.isLoggedIn) {
    const redirectTo = request.nextUrl.pathname.split(
      "/protected-middleware",
    )[0];

    return Response.redirect(`${request.nextUrl.origin}${redirectTo}`, 302);
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: "/:path+/protected-middleware",
};
