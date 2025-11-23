const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  text: { type: String, required: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // optional: track who read it
}, { timestamps: true }); // automatically adds createdAt and updatedAt

module.exports = mongoose.model("Message", messageSchema);
