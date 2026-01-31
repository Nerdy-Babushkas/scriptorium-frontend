const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const requireAuth = (req, res, next) => {
  // 1. Get token from cookies
  const token = req.cookies.token;

  // 2. If no token, redirect to login
  if (!token) {
    return res.redirect("/login");
  }

  // 3. Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request (optional, useful for displaying username)
    next(); // Token is valid, proceed to the route
  } catch (err) {
    // Token is invalid or expired
    console.log("Invalid token:", err.message);
    res.clearCookie("token"); // Clear the bad cookie
    return res.redirect("/login");
  }
};

router.get("/", (req, res) => {
  //done

  res.render("pages/landing");
});

router.get("/login", (req, res) => {
  if (req.cookies.token) return res.redirect("/room");
  res.render("pages/login");
});

router.get("/signup", (req, res) => {
  //not
  res.render("pages/signup");
});

router.get("/about", (req, res) => {
  //done
  res.render("pages/landing");
});

router.get("/features", (req, res) => {
  res.redirect("/#features");
});

router.get("/contact", (req, res) => {
  res.render("pages/contact");
});

router.get("/room", requireAuth, (req, res) => {
  res.render("pages/room");
});

router.get("/account", requireAuth, (req, res) => {
  res.render("pages/placeholder", { pageName: "Account" });
});

router.get("/rewards", requireAuth, (req, res) => {
  res.render("pages/placeholder", { pageName: "Rewards" });
});

router.get("/customise", requireAuth, (req, res) => {
  res.render("pages/placeholder", { pageName: "Customise" });
});

router.get("/progress", requireAuth, (req, res) => {
  res.render("pages/progress");
});

router.get("/library", requireAuth, (req, res) => {
  res.render("pages/library");
});

router.get("/music", requireAuth, (req, res) => {
  res.render("pages/music");
});

router.get("/theatre", requireAuth, (req, res) => {
  res.render("pages/theatre");
});

router.get("/ai-recommendations", requireAuth, (req, res) => {
  res.render("pages/placeholder", { pageName: "AI Recommendations" });
});

router.get("/currently-reading", requireAuth, (req, res) => {
  res.render("pages/placeholder", { pageName: "Currently Reading" });
});

router.get("/add-books", requireAuth, (req, res) => {
  res.render("pages/placeholder", { pageName: "Add Books" });
});

router.get("/currently-watching", requireAuth, (req, res) => {
  res.render("pages/placeholder", { pageName: "Currently Watching" });
});

router.get("/add-media", requireAuth, (req, res) => {
  res.render("pages/placeholder", { pageName: "Add Media" });
});

router.get("/currently-listening", requireAuth, (req, res) => {
  res.render("pages/placeholder", { pageName: "Currently Listening" });
});

router.get("/add-music", requireAuth, (req, res) => {
  res.render("pages/placeholder", { pageName: "Add Music" });
});

router.get("/add-reflection", requireAuth, (req, res) => {
  res.render("pages/placeholder", { pageName: "Add Reflection" });
});



router.use((req, res) => {
  res.status(404).render("pages/404");
});
module.exports = router;
