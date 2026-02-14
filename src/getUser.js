const jwt = require("jsonwebtoken");

function getUserFromCookie(req) {
  const token = req.cookies.token;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.log(`Could not verify token: ${err.message}`);
  }
}
