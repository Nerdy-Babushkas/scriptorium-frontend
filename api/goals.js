const express = require("express");
const router = express.Router();

const BACKEND_BASE =
  process.env.BACKEND_BASE_URL || "https://scriptorium-backend-six.vercel.app";

// Helper: Get raw token from cookie
function getToken(req) {
  return req.cookies?.token || null;
}

// Helper: Standardized Proxy Fetch to handle non-JSON or error responses safely
async function proxyRequest(res, url, options) {
  try {
    const r = await fetch(url, options);
    const contentType = r.headers.get("content-type");

    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await r.json();
    } else {
      data = { message: await r.text() };
    }

    return res.status(r.status).json(data);
  } catch (e) {
    console.error(`Proxy error at ${url}:`, e);
    return res.status(500).json({ message: "Proxy error", error: String(e) });
  }
}

// GET all goals for logged-in user
// Used by search results to check if any results are already "Currently Reading"
router.get("/user", async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ message: "Not logged in" });

  await proxyRequest(res, `${BACKEND_BASE}/api/goals/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });
});

// GET specific goal by ID
// Useful if the UI needs to refresh data for a single item after an update
router.get("/:id", async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ message: "Not logged in" });

  await proxyRequest(res, `${BACKEND_BASE}/api/goals/${req.params.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
});

// ADD goal (e.g., when clicking "Currently Reading" in the search results)
router.post("/add", async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ message: "Not logged in" });

  await proxyRequest(res, `${BACKEND_BASE}/api/goals/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(req.body),
  });
});

// UPDATE goal progress
router.put("/update/:id", async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ message: "Not logged in" });

  await proxyRequest(res, `${BACKEND_BASE}/api/goals/update/${req.params.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(req.body),
  });
});

// DELETE goal (e.g., removing a book from "Currently Reading")
router.delete("/delete/:id", async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ message: "Not logged in" });

  await proxyRequest(res, `${BACKEND_BASE}/api/goals/delete/${req.params.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
});

module.exports = router;
