const NotificationModel = require("../models/Notification");

// Get all notifications for logged-in user with pagination
const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ status: 0, message: "Unauthorized" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await NotificationModel.find({ receiver: userId })
      .populate("sender", "_id username profilePic")
      .populate({
        path: "postId",
        select: "_id author content image",
        populate: { path: "author", select: "_id username profilePic" },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await NotificationModel.countDocuments({ receiver: userId });

    res.json({ status: 1, notifications, total, page, limit });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Get unread notifications count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ status: 0, message: "Unauthorized" });

    const count = await NotificationModel.countDocuments({ receiver: userId, read: false });
    res.json({ status: 1, count });
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Mark a single notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ status: 0, message: "Notification ID required" });

    const notification = await NotificationModel.findById(id);
    if (!notification || String(notification.receiver) !== String(req.userId)) {
      return res.status(404).json({ status: 0, message: "Notification not found" });
    }

    notification.read = true;
    await notification.save();

    res.json({ status: 1, message: "Notification marked as read", notification });
  } catch (err) {
    console.error("Mark as read error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Mark all notifications as read for logged-in user
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ status: 0, message: "Unauthorized" });

    const result = await NotificationModel.updateMany(
      { receiver: userId, read: false },
      { read: true }
    );

    res.json({
      status: 1,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (err) {
    console.error("Mark all as read error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ status: 0, message: "Notification ID required" });

    const notification = await NotificationModel.findById(id);
    if (!notification || String(notification.receiver) !== String(req.userId)) {
      return res.status(404).json({ status: 0, message: "Notification not found" });
    }

    await notification.deleteOne();

    res.json({ status: 1, message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Delete notification error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Create notification (internal use)
const createNotification = async ({ type, sender, receiver, postId }) => {
  try {
    if (!type || !sender || !receiver) return;
    if (String(sender) === String(receiver)) return;

    await NotificationModel.create({ type, sender, receiver, postId: postId || null });
  } catch (err) {
    console.error("Notification creation failed:", err);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};
