import { withIronSessionApiRoute } from "iron-session/next";
import { sessionOptions } from "lib/session";
import { NextApiResponse } from "next";
import type { User } from "pages/api/user";

export default withIronSessionApiRoute(
  async (req, res: NextApiResponse<User>) => {
    req.session.destroy();
    res.json({ isLoggedIn: false, login: "", avatarUrl: "" });
  },
  sessionOptions,
);
