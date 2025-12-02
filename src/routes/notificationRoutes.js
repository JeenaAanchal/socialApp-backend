const express = require("express");
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

// Get all notifications for logged-in user
router.get("/", authMiddleware, getNotifications);

// Get unread notifications count
router.get("/unread-count", authMiddleware, getUnreadCount);

// Mark a single notification as read
router.patch("/read/:id", authMiddleware, markAsRead);

// Mark all notifications as read
router.patch("/read-all", authMiddleware, markAllAsRead);

// Delete a notification
router.delete("/:id", authMiddleware, deleteNotification);

module.exports = router;
