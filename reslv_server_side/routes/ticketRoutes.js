const express = require("express");
const router = express.Router();
const { createTicket, getTickets } = require("../controllers/ticketController");
const { requireAuth, requireRole } = require("../middleware/auth");

// Only Admins and Agents can interact with tickets
router.post("/", requireAuth, requireRole(["admin", "agent"]), createTicket);
router.get("/", requireAuth, requireRole(["admin", "agent"]), getTickets);

module.exports = router;
