const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// 🌱 Load correct env file based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production"
    ? "../.env.production"
    : "../.env.development";
require("dotenv").config({ path: path.resolve(__dirname, envFile) });

const connectDB = require("./config/db");

// Routes
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const messagesRoutes = require("./routes/messagesRoutes");
const chatRoutes = require("./routes/chatRoutes");
const supportRoutes = require("./routes/supportRoutes");

const app = express();

// Parse JSON requests
app.use(express.json());

// CORS for frontend
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/support", supportRoutes);

// Root route
app.get("/", (req, res) => res.send("API is running"));

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Create HTTP server
const server = http.createServer(app);

// Socket.IO with proper CORS
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

// Socket events
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", (roomId) => socket.join(roomId));

  socket.on("sendMessage", async ({ chatId, senderId, text }) => {
    try {
      const Message = require("./models/Message");
      const chat = await Message.findByIdAndUpdate(
        chatId,
        { $push: { messages: { sender: senderId, text } } },
        { new: true }
      );

      if (chat && chat.messages.length > 0) {
        io.to(chatId).emit(
          "receiveMessage",
          chat.messages[chat.messages.length - 1]
        );
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });

  socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

// Connect DB + start server
connectDB()
  .then(() => {
    const port = process.env.SERVER_PORT || 8000;
    server.listen(port, () =>
      console.log(`✅ Server running on port ${port}`)
    );
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
