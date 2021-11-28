# Express example application using iron-session

This is a small example application generated with the [Express application generator](https://expressjs.com/en/starter/generator.html).

The tl;dr; on how to use `iron-session` with Express is this:

```js
import { ironSession } from "iron-session/express";

const session = ironSession({
  cookieName: "iron-session/examples/express",
  password: process.env.SECRET_COOKIE_PASSWORD,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
});

router.get("/profile", session, async function (req, res) {
  // now you can access all of the req.session.* utilities
  if (req.session.user === undefined) {
    res.redirect("/restricted");
    return;
  }

  res.render("profile", {
    title: "Profile",
    userId: req.session.user.id,
  });
});
```
