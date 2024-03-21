import { getIronSession, sealData } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { SessionData, defaultSession, sessionOptions, sleep } from "../lib";

// /app-router-magic-links/session
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const fifteenMinutesInSeconds = 15 * 60;

  const seal = await sealData(
    { username },
    {
      password: "complex_password_at_least_32_characters_long",
      ttl: fifteenMinutesInSeconds,
    },
  );

  return Response.json({
    ok: true,
    // Ideally this would be an email or text message with a link to the magic link route
    magic_link: `${process.env.PUBLIC_URL}/app-router-magic-links/magic-login?seal=${seal}`,
  });
}

// /app-router-magic-links/session
// /app-router-magic-links/session?action=logout
export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);

  console.log(new URL(request.url).searchParams);
  const action = new URL(request.url).searchParams.get("action");
  // /app-router-magic-links/session?action=logout
  if (action === "logout") {
    session.destroy();
    return redirect("/app-router-magic-links");
  }

  // simulate looking up the user in db
  await sleep(250);

  if (session.isLoggedIn !== true) {
    return Response.json(defaultSession);
  }

  return Response.json(session);
}
