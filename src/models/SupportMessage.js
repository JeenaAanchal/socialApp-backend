const mongoose = require("mongoose");

const SupportMessageSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: "SupportTicket", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null for App replies
    text: { type: String, required: true },
    isAppReply: { type: Boolean, default: false }, // true if reply from App
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupportMessage", SupportMessageSchema);
