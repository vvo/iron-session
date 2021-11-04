import { withIronSessionApiRoute } from "iron-session/next";
import { sessionOptions } from "lib/session";

export default withIronSessionApiRoute(async (req, res) => {
  req.session.destroy();
  res.json({ isLoggedIn: false, login: "", avatarUrl: "" });
}, sessionOptions);
