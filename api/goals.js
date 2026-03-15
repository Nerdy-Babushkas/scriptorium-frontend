const express = require("express");
const router = express.Router();

const BACKEND_BASE =
  process.env.BACKEND_BASE_URL || "https://scriptorium-backend-six.vercel.app";

// Helper: Get raw token from cookie
function getToken(req) {
  return req.cookies?.token || null;
}

// GET goals
router.get("/user", async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: "Not logged in" });

    const r = await fetch(`${BACKEND_BASE}/api/goals/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ message: "Proxy error", error: String(e) });
  }
});

// ADD goal
router.post("/add", async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: "Not logged in" });

    const r = await fetch(`${BACKEND_BASE}/api/goals/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ message: "Proxy error", error: String(e) });
  }
});

// UPDATE goal progress
router.put("/update/:id", async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: "Not logged in" });

    const r = await fetch(`${BACKEND_BASE}/api/goals/update/${req.params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ message: "Proxy error", error: String(e) });
  }
});

// DELETE goal
router.delete("/delete/:id", async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: "Not logged in" });

    const r = await fetch(`${BACKEND_BASE}/api/goals/delete/${req.params.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ message: "Proxy error", error: String(e) });
  }
});

module.exports = router;
