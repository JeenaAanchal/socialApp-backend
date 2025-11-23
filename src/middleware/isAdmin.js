// backend/middleware/isAdmin.js
const User = require("../models/User");

module.exports = async function isAdmin(req, res, next) {
  try {
    // authMiddleware must already set req.userId
    const user = await User.findById(req.userId).select("role");
    if (!user || user.role !== "admin") {
      return res.status(403).json({ status: 0, message: "Forbidden: admin only" });
    }
    next();
  } catch (err) {
    console.error("isAdmin error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};
