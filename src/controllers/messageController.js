const MessageModel = require("../models/Messages");
const UserModel = require("../models/User");
const mongoose = require("mongoose");

// Send a new message
const sendMessage = async (req, res) => {
  try {
    const { sender, receiver, text } = req.body;
    if (!sender || !receiver || !text)
      return res.status(400).json({ status: 0, message: "Missing fields" });

    const newMessage = await MessageModel.create({ sender, receiver, text });
    res.json(newMessage);
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Get messages between two users
const getMessages = async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId1) || !mongoose.Types.ObjectId.isValid(userId2))
      return res.status(400).json({ status: 0, message: "Invalid userId" });

    const messages = await MessageModel.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { sender, receiver } = req.params;
    await MessageModel.updateMany(
      { sender, receiver, read: false },
      { $set: { read: true } }
    );
    res.json({ status: 1, message: "Messages marked as read" });
  } catch (err) {
    console.error("markAsRead error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Get last message per chat for a user
const getChats = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ status: 0, message: "Invalid userId" });

    const messages = await MessageModel.find({
      $or: [{ sender: userId }, { receiver: userId }],
    }).sort({ createdAt: -1 });

    const chatMap = new Map();

    for (let msg of messages) {
      const otherId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
      if (!chatMap.has(otherId)) {
        chatMap.set(otherId, {
          _id: otherId,
          lastMessage: msg.text,
          updatedAt: msg.createdAt,
        });
      }
    }

    const chats = await Promise.all(
      Array.from(chatMap.values()).map(async (chat) => {
        const user = await UserModel.findById(chat._id).select("username profilePic");
        return {
          _id: chat._id,
          username: user?.username || "User",
          profilePic: user?.profilePic || "",
          lastMessage: chat.lastMessage,
          updatedAt: chat.updatedAt,
        };
      })
    );

    res.json(chats);
  } catch (err) {
    console.error("getChats error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

module.exports = { sendMessage, getMessages, markAsRead, getChats };
