import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerActionIronSession } from "iron-session";
import { defaultSession, sessionOptions } from "../lib";
import { sleep, SessionData } from "../lib";

export async function POST(request: NextRequest) {
  const session = await getServerActionIronSession<SessionData>(
    sessionOptions,
    cookies(),
  );

  const { username = "No username" } = (await request.json()) as {
    username: string;
  };

  session.isLoggedIn = true;
  session.username = username;
  await session.save();

  // simulate looking up the user in db
  await sleep(250);

  return Response.json(session);
}

export async function GET() {
  const session = await getServerActionIronSession<SessionData>(
    sessionOptions,
    cookies(),
  );

  // simulate looking up the user in db
  await sleep(250);

  if (session.isLoggedIn !== true) {
    return Response.json(defaultSession);
  }

  return Response.json(session);
}

export async function DELETE() {
  const session = await getServerActionIronSession<SessionData>(
    sessionOptions,
    cookies(),
  );

  // /app-router-client-component-route-handler-swr/logout
  await session.destroy();

  return Response.json(defaultSession);
}
