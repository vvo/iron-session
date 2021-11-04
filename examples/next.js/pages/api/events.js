import { withIronSessionApiRoute } from "iron-session/next";
import { sessionOptions } from "lib/session";
import { Octokit } from "octokit";

const octokit = new Octokit();

export default withIronSessionApiRoute(async (req, res) => {
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
}, sessionOptions);
