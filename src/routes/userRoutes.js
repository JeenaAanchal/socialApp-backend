const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const {
  signup,
  login,
  followUser,
  unfollowUser,
  blockUser,
  unblockUser,      // NEW
  updateProfile,
  uploadProfilePic,
  getProfile,
  getFollowers,
  getProfileById,
  changePassword,
  searchUsers,
  getFollowersById,
  getFollowingById,
} = require("../controllers/userController");

const router = express.Router();

// Auth routes
router.post("/signup", signup);
router.post("/login", login);

// Profile routes
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.post("/profile/pic", authMiddleware, upload.single("profilePic"), uploadProfilePic);
router.put("/change-password", authMiddleware, changePassword);

// Follow / unfollow
router.post("/follow/:id", authMiddleware, followUser);
router.post("/unfollow/:id", authMiddleware, unfollowUser);

// Followers list for logged-in user
router.get("/followers", authMiddleware, getFollowers);

// Search users
router.get("/search", authMiddleware, searchUsers);

// Followers & following for ANY user (MUST be before /:id)
router.get("/:id/followers", authMiddleware, getFollowersById);
router.get("/:id/following", authMiddleware, getFollowingById);

// Block / Unblock
router.post("/block/:id", authMiddleware, blockUser);
router.post("/unblock/:id", authMiddleware, unblockUser);   // NEW

// Get user by ID (keep last)
router.get("/:id", authMiddleware, getProfileById);

module.exports = router;
