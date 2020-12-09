import withSession from "../../lib/session";

export default withSession(async (req, res) => {
  req.session.destroy();
  res.setHeader("cache-control", "no-cache");
  res.json({ isLoggedIn: false });
});
