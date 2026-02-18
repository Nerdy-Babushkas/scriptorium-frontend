const express = require("express");
const router = express.Router();

const BACKEND_BASE =
  process.env.BACKEND_BASE_URL ||
  "https://scriptorium-backend-git-dylan-nerdy-babushkas-projects.vercel.app";

// GET goals for user
router.get("/user", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const r = await fetch(`${BACKEND_BASE}/api/goals/user`, {
      headers: { Authorization: auth },
    });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ message: "Proxy error", error: String(e) });
  }
});

// ADD goal
router.post("/add", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const r = await fetch(`${BACKEND_BASE}/api/goals/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(req.body),
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
    const auth = req.headers.authorization || "";
    const r = await fetch(`${BACKEND_BASE}/api/goals/update/${req.params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ message: "Proxy error", error: String(e) });
  }
});

module.exports = router;
