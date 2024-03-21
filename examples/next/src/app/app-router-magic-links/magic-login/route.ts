import { getIronSession, unsealData } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SessionData, sessionOptions } from "../lib";

export async function GET(request: NextRequest) {
  const seal = new URL(request.url).searchParams.get("seal") as string;
  const { username } = await unsealData<{ username: string }>(seal, {
    password: sessionOptions.password,
  });
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.isLoggedIn = true;
  session.username = username ?? "No username";
  await session.save();

  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/303
  // not using redirect() yet: https://github.com/vercel/next.js/issues/51592#issuecomment-1810212676
  return Response.redirect(
    `${request.nextUrl.origin}/app-router-magic-links`,
    303,
  );
}
