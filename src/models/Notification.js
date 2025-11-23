const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // "like", "comment", "follow", "support_reply"
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null if App
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" }, // optional
    text: { type: String }, // NEW: store the support reply text
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
