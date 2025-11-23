const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const {
  createPost,
  getUserPosts,
  getFeed,
  getPostById,
  likePost,
  addComment,
  deleteComment,
  deletePost,
} = require("../controllers/postController");

// Create a new post
router.post("/", authMiddleware, upload.single("image"), createPost);

// Get feed posts
router.get("/feed", authMiddleware, getFeed);

// Get posts by a specific user
router.get("/user/:userId", authMiddleware, getUserPosts);

// Get single post
router.get("/:id", authMiddleware, getPostById);

// Like/unlike post
router.post("/:postId/like", authMiddleware, likePost);

// Add comment
router.post("/:postId/comment", authMiddleware, addComment);

// Delete comment
router.delete("/:postId/comment/:commentId", authMiddleware, deleteComment);

// Delete post
router.delete("/:postId", authMiddleware, deletePost);

module.exports = router;
