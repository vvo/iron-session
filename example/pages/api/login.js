import fetch from "../../lib/fetch";
import withSession from "../../lib/session";

export default withSession(async (req, res) => {
  const { username } = await req.body;
  const url = `https://api.github.com/users/${username}`;

  try {
    // we check that the user exists on GitHub and store some data in session
    const { login, avatar_url: avatarUrl } = await fetch(url);
    req.session.set("user", { login, avatarUrl });
    await req.session.save();
    res.json({ ok: true });
  } catch (error) {
    const { response: fetchResponse } = error;
    res.status(fetchResponse?.status || 500);
    res.json(error.data);
  }
});
