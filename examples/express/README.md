# Express example application using next-iron-session

This is a small example application generated with the [Express application generator](https://expressjs.com/en/starter/generator.html).

The tl;dr; on how to use `next-iron-session` with Express is this:

```js
import { ironSession } from "next-iron-session";

const session = ironSession({
  cookieName: "next-iron-session/examples/express",
  password: process.env.SECRET_COOKIE_PASSWORD,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
});

router.get("/profile", session, async function (req, res) {
  // now you can access all of the req.session.* utilities
  if (req.session.get("user") === undefined) {
    res.redirect("/restricted");
    return;
  }

  res.render("profile", {
    title: "Profile",
    userId: req.session.get("user").id,
  });
});
```
