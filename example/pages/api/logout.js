import withSession from "../../lib/session";

export default withSession(async (req, res) => {
  req.session.destroy();
  await req.session.save();
  res.status(200).send({ isLoggedIn: false });
});
