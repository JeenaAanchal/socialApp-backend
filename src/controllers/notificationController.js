const NotificationModel = require("../models/Notification");

// Get all notifications for logged-in user
const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const notifications = await NotificationModel.find({ receiver: userId })
      .populate("sender", "_id username profilePic")
      .populate({
        path: "postId",
        select: "_id author content image",
        populate: {
          path: "author",
          select: "_id username profilePic",
        },
      })
      .sort({ createdAt: -1 });

    res.json({ status: 1, notifications });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;

    const updated = await NotificationModel.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ status: 0, message: "Notification not found" });

    res.json({ status: 1, message: "Notification marked as read" });
  } catch (err) {
    console.error("Mark as read error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Create notification (internal use)
const createNotification = async ({ type, sender, receiver, postId }) => {
  try {
    if (String(sender) === String(receiver)) return;

    await NotificationModel.create({
      type,
      sender,
      receiver,
      postId: postId || null,
    });
  } catch (err) {
    console.error("Notification creation failed:", err);
  }
};

module.exports = { getNotifications, markAsRead, createNotification };
