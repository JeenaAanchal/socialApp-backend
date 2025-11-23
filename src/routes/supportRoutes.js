const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const supportController = require("../controllers/supportController");

// USER
router.post("/ticket", auth, supportController.createTicket);
router.get("/my", auth, supportController.getMyTickets);
router.get("/messages/:ticketId", auth, supportController.getTicketMessages);
router.post("/messages/:ticketId", auth, supportController.postMessage);

// ADMIN
router.get("/admin/all", auth, supportController.listAllTickets);
router.patch("/admin/status/:ticketId", auth, supportController.updateTicketStatus);

module.exports = router;
