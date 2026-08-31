import { getIronSession, unsealData } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { seeOther } from "../../../see-other";
import { magicLinkTokenOptions, sessionOptions, type SessionData } from "../lib";

export async function GET(request: NextRequest) {
  const seal = new URL(request.url).searchParams.get("seal") as string;
  const { username } = await unsealData<{ username: string }>(seal, magicLinkTokenOptions);

  // An expired or tampered token unseals to an empty object rather than
  // throwing, so an absent username is the "not a valid link" case.
  if (!username) {
    return seeOther("/app-router-magic-links");
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.isLoggedIn = true;
  session.username = username;
  await session.save();

  return seeOther("/app-router-magic-links");
}
