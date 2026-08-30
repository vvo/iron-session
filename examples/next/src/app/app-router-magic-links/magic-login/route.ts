import { getIronSession, unsealData } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { magicLinkTokenOptions, sessionOptions, type SessionData } from "../lib";

export async function GET(request: NextRequest) {
  const seal = new URL(request.url).searchParams.get("seal") as string;
  const { username } = await unsealData<{ username: string }>(seal, magicLinkTokenOptions);

  // An expired or tampered token unseals to an empty object rather than
  // throwing, so an absent username is the "not a valid link" case.
  if (!username) {
    return Response.redirect(`${request.nextUrl.origin}/app-router-magic-links`, 303);
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.isLoggedIn = true;
  session.username = username;
  await session.save();

  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/303
  // not using redirect() yet: https://github.com/vercel/next.js/issues/51592#issuecomment-1810212676
  return Response.redirect(`${request.nextUrl.origin}/app-router-magic-links`, 303);
}
