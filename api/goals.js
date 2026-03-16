//api/goals.js

const express = require("express");
const router = express.Router();

const BACKEND_BASE =
  process.env.BACKEND_BASE_URL || "https://scriptorium-backend-six.vercel.app";

/*
 Helper: Get token from HTTP-only cookie
*/
function getToken(req) {
  return req.cookies?.token || null;
}

/*
 Helper: Standard proxy request
*/
async function proxyRequest(res, url, options) {
  try {
    const response = await fetch(url, options);

    const contentType = response.headers.get("content-type");

    let data;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({
      message: "Proxy request failed",
      error: String(error),
    });
  }
}

/*
 GET all goals for logged-in user
*/
router.get("/user", async (req, res) => {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ message: "Not logged in" });
  }

  await proxyRequest(res, `${BACKEND_BASE}/api/goals/user`, {
    method: "GET",
    headers: {
      Authorization: `jwt ${token}`,
    },
  });
});

/*
 GET single goal
*/
router.get("/:id", async (req, res) => {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ message: "Not logged in" });
  }

  await proxyRequest(res, `${BACKEND_BASE}/api/goals/${req.params.id}`, {
    method: "GET",
    headers: {
      Authorization: `jwt ${token}`,
    },
  });
});

/*
 ADD goal
*/
router.post("/add", async (req, res) => {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ message: "Not logged in" });
  }

  await proxyRequest(res, `${BACKEND_BASE}/api/goals/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `jwt ${token}`,
    },
    body: JSON.stringify(req.body),
  });
});

/*
 UPDATE goal progress
*/
router.put("/update/:id/progress", async (req, res) => {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ message: "Not logged in" });
  }

  await proxyRequest(
    res,
    `${BACKEND_BASE}/api/goals/update/${req.params.id}/progress`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `jwt ${token}`,
      },
      body: JSON.stringify(req.body),
    },
  );
});

router.put("/update/:id", async (req, res) => {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ message: "Not logged in" });
  }

  await proxyRequest(res, `${BACKEND_BASE}/api/goals/update/${req.params.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `jwt ${token}`,
    },
    body: JSON.stringify(req.body),
  });
});

/*
 DELETE goal
*/
router.delete("/delete/:id", async (req, res) => {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ message: "Not logged in" });
  }

  await proxyRequest(res, `${BACKEND_BASE}/api/goals/delete/${req.params.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `jwt ${token}`,
    },
  });
});

module.exports = router;
