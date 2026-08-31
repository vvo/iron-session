import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { defaultSession, sessionOptions } from "../lib";
import { redirect } from "next/navigation";
import { sleep, SessionData } from "../lib";
import { seeOther } from "../../../see-other";

// /app-router-client-component-redirect-route-handler-fetch/session
export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  const formData = await request.formData();

  session.isLoggedIn = true;
  session.username = (formData.get("username") as string) ?? "No username";
  await session.save();

  // simulate looking up the user in db
  await sleep(250);

  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/303
  return seeOther("/app-router-client-component-redirect-route-handler-fetch");
}

// /app-router-client-component-redirect-route-handler-fetch/session
// /app-router-client-component-redirect-route-handler-fetch/session?action=logout
export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  const action = new URL(request.url).searchParams.get("action");
  // /app-router-client-component-redirect-route-handler-fetch/session?action=logout
  if (action === "logout") {
    session.destroy();
    return redirect("/app-router-client-component-redirect-route-handler-fetch");
  }

  // simulate looking up the user in db
  await sleep(250);

  if (session.isLoggedIn !== true) {
    return Response.json(defaultSession);
  }

  return Response.json(session);
}
