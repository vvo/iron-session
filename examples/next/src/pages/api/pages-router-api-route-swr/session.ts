import { NextApiRequest, NextApiResponse } from "next";
import { getIronSession } from "iron-session";
import {
  defaultSession,
  sessionOptions,
  sleep,
  SessionData,
} from "../../../pages-components/pages-router-api-route-swr/lib";

// login
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions,
  );

  if (request.method === "POST") {
    const { username = "No username" } = request.body;

    session.isLoggedIn = true;
    session.username = username;
    await session.save();

    // simulate looking up the user in db
    await sleep(250);

    return response.json(session);
  } else if (request.method === "GET") {
    // simulate looking up the user in db
    await sleep(250);

    if (session.isLoggedIn !== true) {
      return response.json(defaultSession);
    }

    return response.json(session);
  } else if (request.method === "DELETE") {
    session.destroy();

    return response.json(defaultSession);
  }

  return response.status(405).end(`Method ${request.method} Not Allowed`);
}
