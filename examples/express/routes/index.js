var express = require("express");
var ironSession = require("iron-session/express").ironSession;

var router = express.Router();
var session = ironSession({
  cookieName: "iron-session/examples/express",
  password: process.env.SECRET_COOKIE_PASSWORD,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
});

/* GET home page. */
router.get("/", function (req, res) {
  res.render("index", { title: "Express" });
});

router.get("/login", session, async function (req, res) {
  req.session.user = { id: 20 };
  await req.session.save();
  res.redirect("/profile");
});

router.get("/profile", session, async function (req, res) {
  if (req.session.user === undefined) {
    res.redirect("/restricted");
    return;
  }

  res.render("profile", {
    title: "Profile",
    userId: req.session.user.id,
  });
});

// use POST for logout so that its not cached by default
// see https://github.com/vvo/iron-session/issues/274
router.post("/logout", session, async function (req, res) {
  req.session.destroy();
  res.redirect("/");
});

router.get("/restricted", function (req, res) {
  res.render("restricted", { title: "Restricted" });
});

module.exports = router;
