import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerActionIronSession } from "iron-session";
import { defaultSession, ironSessionOptions } from "../config";
import { SessionData } from "@/app/types";
import { redirect } from "next/navigation";

// /app-router/login
export async function POST(
  request: NextRequest,
  { params }: { params: { action: string } },
) {
  if (params.action !== "login") {
    return new Response("Unknown path", { status: 404 });
  }

  const session = await getServerActionIronSession<SessionData>(
    ironSessionOptions,
    cookies(),
  );

  const formData = await request.formData();

  session.isLoggedIn = true;
  session.username =
    (formData.get("username") as string) ?? "No username provided";
  await session.save();

  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/303
  // not using redirect() yet: https://github.com/vercel/next.js/issues/51592#issuecomment-1810212676
  return Response.redirect(`${request.nextUrl.origin}/app-router`, 303);
}

// /app-router/session
// /app-router/logout
export async function GET(
  request: NextRequest,
  { params }: { params: { action: string } },
) {
  if (params.action !== "session" && params.action !== "logout") {
    return new Response("Unknown path", { status: 404 });
  }

  const session = await getServerActionIronSession<SessionData>(
    ironSessionOptions,
    cookies(),
  );

  // /app-router/logout
  if (params.action === "logout") {
    await session.destroy();
    return redirect("/app-router");
  }

  if (session.isLoggedIn !== true) {
    return Response.json(defaultSession);
  }

  return Response.json(session);
}
