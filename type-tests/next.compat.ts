/**
 * Compile-only test: iron-session must accept the objects Next.js actually
 * hands you, under the strictest settings we can turn on.
 *
 * Issue #840 sat open for months because nothing here was checked. Our
 * `CookieStore.set` was an overload pair while Next declares a single signature
 * over a tuple union, so `getIronSession(await cookies(), ...)` did not
 * typecheck and the accepted workaround became `as any`, which is a cast around
 * an auth boundary.
 *
 * This file is never executed and never shipped. `pnpm lint:types` runs it, so
 * a Next.js release that changes these shapes breaks our CI rather than a
 * user's build.
 */
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getIronSession, nextProxyCookies } from "iron-session";

interface Session {
  user?: { id: number };
}

const options = {
  cookieName: "session",
  password: process.env["SESSION_PASSWORD"] as string,
};

// App Router: `await cookies()` goes straight in, no cast.
export async function serverComponent(): Promise<number | undefined> {
  const session = await getIronSession<Session>(await cookies(), options);
  return session.user?.id;
}

// Server Action: same store, and destroy() must be reachable.
export async function signOut(): Promise<void> {
  const session = await getIronSession<Session>(await cookies(), options);
  session.destroy();
}

// Route Handler.
export async function GET(): Promise<Response> {
  const session = await getIronSession<Session>(await cookies(), options);
  session.user = { id: 1 };
  await session.save();
  return Response.json({ id: session.user.id });
}

// proxy.ts, the middleware successor. Rotating a session here is #887, #709,
// #684 and #938.
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  const session = await getIronSession<Session>(nextProxyCookies(request, response), options);

  if (session.user) {
    session.user = { id: session.user.id };
    await session.save();
  }

  return response;
}
