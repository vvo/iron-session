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

  // In a real application you would send back this data and use it to send an email
  // For the example purposes we will just display a webpage
  // return Response.json({
  //   ok: true,
  //   // Ideally this would be an email or text message with a link to the magic link route
  //   magic_link: `${process.env.PUBLIC_URL}/app-router-magic-links/magic-login?seal=${seal}`,
  // });
  const link = `${process.env.NEXT_PUBLIC_URL}/app-router-magic-links/magic-login?seal=${seal}`;
  return new Response(
    `<h1>Here is your magic link:</h1><h3><a href="${link}">${link}</a></h3><h3>You can now open this link in a private browser window and see yourself being logged in immediately.</h3><h3>👈 <a href="/app-router-magic-links">Go back</a></h3>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );
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
