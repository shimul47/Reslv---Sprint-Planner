import express from "express";
import {
  submitFeedback,
  getTicketFeedback,
  getAgentScore,
  getMyScore,
  getFeedbackDashboard,
  ADMIN_ROLES,
} from "../controllers/feedbackController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

// Dashboard (admin only) — must come before /:ticketNumber param routes
router.get("/dashboard", requireRoles(ADMIN_ROLES), getFeedbackDashboard);

// My own satisfaction score (any authenticated user)
router.get("/my-score", getMyScore);

// Per-agent score
router.get("/agent/:agentId/score", getAgentScore);

// Per-ticket feedback
router.get("/ticket/:ticketNumber", getTicketFeedback);

// Submit feedback
router.post("/", submitFeedback);

export default router;
