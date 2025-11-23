const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// Correct dotenv path: one level above src
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const messagesRoutes = require("./routes/messagesRoutes");
const chatRoutes = require("./routes/chatRoutes");
const supportRoutes = require("./routes/supportRoutes");

const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/api/messages", messagesRoutes);
app.use("/api/chats", chatRoutes);


app.use("/api/support", supportRoutes);



// HTTP server
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, { cors: { origin: "*" } });
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", (roomId) => socket.join(roomId));
  socket.on("sendMessage", async ({ chatId, senderId, text }) => {
    const Message = require("./models/Message");
    const chat = await Message.findByIdAndUpdate(
      chatId,
      { $push: { messages: { sender: senderId, text } } },
      { new: true }
    );
    io.to(chatId).emit("receiveMessage", chat.messages[chat.messages.length - 1]);
  });

  socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

// Start server
connectDB().then(() => {
  server.listen(process.env.SERVER_PORT || 8000, () =>
    console.log("✅ Server running on port", process.env.SERVER_PORT || 8000)
  );
});
