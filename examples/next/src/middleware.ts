import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  sessionOptions as appRouterClientComponentRouteHandlerSwrIronOptions,
  defaultSession,
} from "./app/app-router-client-component-route-handler-swr/lib";
import { cookies } from "next/headers";
import { IronSessionOptions, getServerActionIronSession } from "iron-session";

// Only here for the multi examples demo, in your app this would be imported from elsewhere
interface SessionData {
  username: string;
  isLoggedIn: boolean;
}

const sessionOptions: Record<string, IronSessionOptions> = {
  "/app-router-client-component-route-handler-swr/protected-middleware":
    appRouterClientComponentRouteHandlerSwrIronOptions,
};

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const session = await getServerActionIronSession<SessionData>(
    sessionOptions[request.nextUrl.pathname],
    cookies(),
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
