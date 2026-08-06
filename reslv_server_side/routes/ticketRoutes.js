import express from "express";
import {
  getTickets,
  getTicket,
  createTicket,
  addTicketMessage,
  addTicketNote,
  escalateTicket,
  resolveTicket,
  assignTicket,
  patchTicket,
  listAssignableAgents,
  getTicketSettings,
  updateTicketSettings,
  getTicketReports,
  AGENT_ROLES,
} from "../controllers/ticketApiController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

// Static-segment routes must come before "/:ticketNumber" so words like
// "team", "settings", "reports" aren't parsed as a ticket number.
router.get("/team/agents", requireRoles(AGENT_ROLES), listAssignableAgents);
router.get("/settings", requireRoles(["admin", "superadmin"]), getTicketSettings);
router.patch("/settings", requireRoles(["admin", "superadmin"]), updateTicketSettings);
router.get("/reports/summary", requireRoles(["admin", "superadmin"]), getTicketReports);

router.get("/", getTickets);
router.get("/:ticketNumber", getTicket);
router.post("/", requireRoles(AGENT_ROLES), createTicket);
router.post("/:ticketNumber/messages", addTicketMessage);
router.post("/:ticketNumber/notes", requireRoles(AGENT_ROLES), addTicketNote);
router.patch("/:ticketNumber/escalate", requireRoles(AGENT_ROLES), escalateTicket);
router.patch("/:ticketNumber/resolve", requireRoles(AGENT_ROLES), resolveTicket);
router.patch("/:ticketNumber/assign", requireRoles(AGENT_ROLES), assignTicket);
router.patch("/:ticketNumber", requireRoles(AGENT_ROLES), patchTicket);

export default router;
