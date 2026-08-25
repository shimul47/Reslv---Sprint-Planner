import express from "express";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";
import {
  getAuthUrl,
  oauthCallback,
  getStatus,
  disconnect,
  getAvailability,
  getTeamAvailability,
  nudgeCalendarConnect,
} from "../controllers/calendarController.js";

const router = express.Router();

const OVERSEER_ROLES = ["admin", "superadmin", "sprint_planner"];

router.get("/auth-url", requireAuth, getAuthUrl);
router.get("/status", requireAuth, getStatus);
router.post("/disconnect", requireAuth, disconnect);
router.get("/availability", requireAuth, getAvailability);
router.get("/team-availability", requireAuth, requireRoles(OVERSEER_ROLES), getTeamAvailability);
router.post("/nudge/:userId", requireAuth, requireRoles(OVERSEER_ROLES), nudgeCalendarConnect);

// No requireAuth here — Google redirects the browser directly, no auth header
router.get("/oauth/callback", oauthCallback);

export default router;