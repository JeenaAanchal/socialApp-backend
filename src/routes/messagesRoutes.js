const express = require("express");
const { sendMessage, getMessages, markAsRead, getChats } = require("../controllers/messageController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All routes protected
router.use(authMiddleware);

// Send a message
router.post("/", sendMessage);

// Get messages between two users
router.get("/:userId1/:userId2", getMessages);

// Mark messages as read
router.put("/read/:sender/:receiver", markAsRead);

// Get chats for a user
router.get("/chats/:userId", getChats);

module.exports = router;
