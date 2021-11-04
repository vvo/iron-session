import { withIronSessionApiRoute } from "iron-session/next";
import { sessionOptions } from "lib/session";

export default withIronSessionApiRoute(logoutRoute, sessionOptions);

async function logoutRoute(req, res) {
  req.session.destroy();
  res.json({ isLoggedIn: false, login: "", avatarUrl: "" });
}
