var express = require("express");
var ironSession = require("next-iron-session").ironSession;

var router = express.Router();
var session = ironSession({
  cookieName: "next-iron-session/examples/express",
  password: process.env.SECRET_COOKIE_PASSWORD,
  cookieOptions: {
    // the next line allows to use the session in non-https environements
    secure: process.env.NODE_ENV === "production" ? true : false,
  },
});

/* GET home page. */
router.get("/", function (req, res) {
  res.render("index", { title: "Express" });
});

router.get("/login", session, async function (req, res) {
  req.session.set("user", { id: 20 });
  await req.session.save();
  res.redirect("/profile");
});

router.get("/profile", session, async function (req, res) {
  if (req.session.get("user") === undefined) {
    res.redirect("/restricted");
    return;
  }

  res.render("profile", {
    title: "Profile",
    userId: req.session.get("user").id,
  });
});

router.get("/logout", session, async function (req, res) {
  req.session.destroy();
  res.redirect("/");
});

router.get("/restricted", function (req, res) {
  res.render("restricted", { title: "Restricted" });
});

module.exports = router;
