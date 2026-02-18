const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

const BACKEND_BASE =
  process.env.BACKEND_BASE_URL ||
  "https://scriptorium-backend-git-dylan-nerdy-babushkas-projects.vercel.app";

// helper: cookie token -> userId (NO verify)
function getUserIdFromCookie(req) {
  const token = req.cookies?.token;
  if (!token) return null;

  const decoded = jwt.decode(token); // no signature check
  return decoded?._id || null;
}

// GET goals for logged-in user
router.get("/user", async (req, res) => {
  try {
    const userId = getUserIdFromCookie(req);
    if (!userId) return res.status(401).json({ message: "Not logged in" });

    // NOTE: no /noauth needed if you added the :userId routes to routes/goals.js
    const r = await fetch(`${BACKEND_BASE}/api/goals/user/${userId}`);
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ message: "Proxy error", error: String(e) });
  }
});

// ADD goal
router.post("/add", async (req, res) => {
  try {
    const userId = getUserIdFromCookie(req);
    if (!userId) return res.status(401).json({ message: "Not logged in" });

    const r = await fetch(`${BACKEND_BASE}/api/goals/add/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body), // DO NOT add userId here
    });

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ message: "Proxy error", error: String(e) });
  }
});

// UPDATE goal progress
router.put("/update/:id", async (req, res) => {
  try {
    const userId = getUserIdFromCookie(req);
    if (!userId) return res.status(401).json({ message: "Not logged in" });

    const r = await fetch(
      `${BACKEND_BASE}/api/goals/update/${req.params.id}/${userId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body), // DO NOT add userId here
      },
    );

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ message: "Proxy error", error: String(e) });
  }
});

module.exports = router;
