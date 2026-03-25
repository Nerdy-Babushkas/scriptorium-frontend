//routes/pageRoutes.js
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

router.use((req, res, next) => {
  res.locals.user = null;

  const token = req.cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.locals.user = decoded; // this makes <%= user %> available in EJS
    } catch (err) {
      res.clearCookie("token");
    }
  }

  next();
});

router.use("/api/goals", require("../api/goals"));

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
  res.render("pages/recommendations");
});

router.get("/search", requireAuth, (req, res) => {
  const query = req.query.q; // Capture query from URL
  const type = req.query.type || "movies"; // Capture type (default to movies)
  res.render("pages/search-results", { query, type }); // Pass both to view (optional, used in Navbar)
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
  res.render("pages/add-reflection");
});

router.get("/verify-email", (req, res) => {
  res.render("pages/verify-email");
});

router.get("/forgot-password", (req, res) => {
  res.render("pages/forgot-password");
});

router.get("/reset-password/:token", (req, res) => {
  const { token } = req.params;
  res.render("pages/reset-password", { token });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.redirect("/");
});

router.get("/reflections-history", requireAuth, (req, res) => {
  res.render("pages/reflections-history");
});

router.get("/reflection/:id", requireAuth, (req, res) => {
  res.render("pages/reflection-detail", { reflectionId: req.params.id });
});

router.use((req, res) => {
  res.status(404).render("pages/404");
});

module.exports = router;
