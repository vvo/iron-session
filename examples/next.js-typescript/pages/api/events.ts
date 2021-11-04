import { withIronSessionApiRoute } from "iron-session/next";
import { sessionOptions } from "lib/session";
import { Octokit } from "octokit";

const octokit = new Octokit();

import type { Endpoints } from "@octokit/types";
import { NextApiResponse } from "next";

export type Events =
  Endpoints["GET /users/{username}/events"]["response"]["data"];

export default withIronSessionApiRoute(
  async (req, res: NextApiResponse<Events>) => {
    const user = req.session.user;

    if (!user || user.isLoggedIn === false) {
      res.status(401).end();
      return;
    }

    try {
      const { data: events } =
        await octokit.rest.activity.listPublicEventsForUser({
          username: user.login,
        });

      res.json(events);
    } catch (error) {
      res.status(200).json([]);
    }
  },
  sessionOptions,
);
