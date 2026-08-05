import express from "express";
import {
  getTickets,
  getTicket,
  addTicketMessage,
  addTicketNote,
  escalateTicket,
  resolveTicket,
} from "../controllers/ticketApiController.js";
import { protect } from "../middlewares/auth.js"; // Updated to match your actual export

const router = express.Router();

// Apply your real authentication middleware
router.use(protect);

// Dynamic controllers
router.get("/", getTickets);
router.get("/:ticketNumber", getTicket);
router.post("/:ticketNumber/messages", addTicketMessage);
router.post("/:ticketNumber/notes", addTicketNote);
router.patch("/:ticketNumber/escalate", escalateTicket);
router.patch("/:ticketNumber/resolve", resolveTicket);

export default router;
