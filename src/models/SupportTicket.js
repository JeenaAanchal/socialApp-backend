// backend/models/SupportTicket.js
const mongoose = require("mongoose");

const SupportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, default: "Support Request" },
    status: { type: String, enum: ["open","closed"], default: "open" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupportTicket", SupportTicketSchema);
