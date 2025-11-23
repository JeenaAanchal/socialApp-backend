const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createOrGetChat,
  getChats,
  addMessage,
  getChatById,
  deleteChat,
} = require("../controllers/chatController");

// Protect all routes
router.use(authMiddleware);

router.post("/createOrGet", createOrGetChat); // create or get chat
router.post("/message", addMessage);          // send message
router.get("/", getChats);                     // get all chats
router.get("/:chatId", getChatById);          // get single chat
router.delete("/:chatId", deleteChat);        // delete chat

module.exports = router;
