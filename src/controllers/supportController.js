const SupportTicket = require("../models/SupportTicket");
const SupportMessage = require("../models/SupportMessage");
const User = require("../models/User");
const NotificationModel = require("../models/Notification");

// User: create new ticket
exports.createTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!message || !message.trim())
      return res.status(400).json({ status: 0, message: "Message required" });

    const ticket = await SupportTicket.create({
      user: req.userId,
      subject: subject || "Support Request",
    });

    const msg = await SupportMessage.create({
      ticket: ticket._id,
      sender: req.userId,
      text: message,
    });

    const populated = await SupportTicket.findById(ticket._id).populate(
      "user",
      "username email profilePic"
    );

    res.json({ status: 1, ticket: populated, firstMessage: msg });
  } catch (err) {
    console.error("createTicket error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// User: get own tickets
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .populate("user", "username email profilePic")
      .lean();

    const ticketIds = tickets.map((t) => t._id);
    const lastMessages = await SupportMessage.aggregate([
      { $match: { ticket: { $in: ticketIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$ticket",
          text: { $first: "$text" },
          createdAt: { $first: "$createdAt" },
        },
      },
    ]);

    const lastMap = {};
    lastMessages.forEach((lm) => (lastMap[String(lm._id)] = lm));

    const result = tickets.map((t) => ({
      ...t,
      lastMessage: lastMap[String(t._id)] || null,
    }));

    res.json({ status: 1, tickets: result });
  } catch (err) {
    console.error("getMyTickets error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Get ticket messages (user or admin)
exports.getTicketMessages = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket)
      return res.status(404).json({ status: 0, message: "Ticket not found" });

    if (String(ticket.user) !== String(req.userId)) {
      const user = await User.findById(req.userId).select("role");
      if (!user || user.role !== "admin")
        return res.status(403).json({ status: 0, message: "Forbidden" });
    }

    let messages = await SupportMessage.find({ ticket: ticketId })
      .sort({ createdAt: 1 })
      .populate("sender", "username role profilePic")
      .lean();

    // Override admin username to Lynk
    messages.forEach((m) => {
      if (m.sender.role === "admin") m.sender.username = "Lynk";
    });

    res.json({ status: 1, ticket, messages });
  } catch (err) {
    console.error("getTicketMessages error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Post a message to a ticket
exports.postMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim())
      return res.status(400).json({ status: 0, message: "Message required" });

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket)
      return res.status(404).json({ status: 0, message: "Ticket not found" });

    const user = await User.findById(req.userId).select("role");

    // Determine sender ID
    let senderId = req.userId;
    if (user.role === "admin") {
      // Admin reply should appear as Lynk
      let lynkUser = await User.findOne({ username: "Lynk" });
      if (!lynkUser) {
        // Create Lynk user if it doesn't exist
        lynkUser = await User.create({
          username: "Lynk",
          email: "lynk@system.com",
          password: "admin", // dummy password, never used
          role: "admin",
        });
      }
      senderId = lynkUser._id;
    } else if (String(ticket.user) !== String(req.userId)) {
      return res.status(403).json({ status: 0, message: "Forbidden" });
    }

    const msg = await SupportMessage.create({
      ticket: ticketId,
      sender: senderId,
      text,
    });

    let populated = await SupportMessage.findById(msg._id).populate(
      "sender",
      "username role profilePic"
    );

    // Override admin username to Lynk
    if (populated.sender.role === "admin") populated.sender.username = "Lynk";

    // Notification
    if (user.role === "admin") {
      const { createNotification } = require("./notificationController");
      await createNotification({
        type: "support_reply",
        sender: senderId,
        receiver: ticket.user,
      });
    }

    res.json({ status: 1, message: populated });
  } catch (err) {
    console.error("postMessage error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Admin: list all tickets
exports.listAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .sort({ createdAt: -1 })
      .populate("user", "username email profilePic")
      .lean();

    res.json({ status: 1, tickets });
  } catch (err) {
    console.error("listAllTickets error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

// Admin: change ticket status
exports.updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;
    if (!["open", "closed"].includes(status))
      return res.status(400).json({ status: 0, message: "Invalid status" });

    const updated = await SupportTicket.findByIdAndUpdate(
      ticketId,
      { status },
      { new: true }
    );
    res.json({ status: 1, ticket: updated });
  } catch (err) {
    console.error("updateTicketStatus error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};
