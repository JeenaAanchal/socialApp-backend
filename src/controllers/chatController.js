const mongoose = require("mongoose");
const ChatModel = require("../models/Chat");
const UserModel = require("../models/User");

// Create or get a chat between two users
const createOrGetChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const myId = req.userId;

    if (!userId) return res.status(400).json({ status: 0, message: "userId required" });

    const myObjectId = new mongoose.Types.ObjectId(myId);
    const otherObjectId = new mongoose.Types.ObjectId(userId);

    let chat = await ChatModel.findOne({
      participants: { $all: [myObjectId, otherObjectId] },
    }).populate("participants", "username profilePic");

    if (!chat) {
      chat = await ChatModel.create({ participants: [myObjectId, otherObjectId] });
      chat = await chat.populate("participants", "username profilePic");
    }

    res.json({ status: 1, chat });
  } catch (err) {
    console.error("createOrGetChat error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Get all chats for logged-in user
const getChats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const chats = await ChatModel.find({ participants: userId })
      .populate("participants", "username profilePic")
      .populate("messages.sender", "username profilePic")
      .sort({ updatedAt: -1 });

    res.json({ status: 1, chats });
  } catch (err) {
    console.error("getChats error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Add a message to a chat
const addMessage = async (req, res) => {
  try {
    const { chatId, text } = req.body;
    const sender = req.userId;

    if (!chatId || !text) return res.status(400).json({ status: 0, message: "chatId and text required" });

    const chat = await ChatModel.findById(chatId);
    if (!chat) return res.status(404).json({ status: 0, message: "Chat not found" });

    const newMessage = { sender, text, read: false };
    chat.messages.push(newMessage);
    chat.latestMessage = text;
    await chat.save();

    await chat.populate("participants", "username profilePic");
    await chat.populate("messages.sender", "username profilePic");

    res.json({ status: 1, chat });
  } catch (err) {
    console.error("addMessage error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Get a single chat by ID
const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await ChatModel.findById(chatId)
      .populate("participants", "username profilePic")
      .populate("messages.sender", "username profilePic");

    if (!chat) return res.status(404).json({ status: 0, message: "Chat not found" });

    res.json({ status: 1, chat });
  } catch (err) {
    console.error("getChatById error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Mark all messages in a chat as read for the logged-in user
const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await ChatModel.findById(chatId);
    if (!chat) return res.status(404).json({ status: 0, message: "Chat not found" });

    chat.messages.forEach((msg) => {
      if (msg.sender.toString() !== userId) msg.read = true;
    });

    await chat.save();

    res.json({ status: 1, message: "Messages marked as read" });
  } catch (err) {
    console.error("markMessagesAsRead error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Delete a chat
const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await ChatModel.findByIdAndDelete(chatId);
    if (!chat) return res.status(404).json({ status: 0, message: "Chat not found" });

    res.json({ status: 1, message: "Chat deleted successfully" });
  } catch (err) {
    console.error("deleteChat error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

module.exports = { createOrGetChat, getChats, addMessage, getChatById, markMessagesAsRead, deleteChat };
