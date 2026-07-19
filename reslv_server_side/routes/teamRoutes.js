import express from "express";
import {
  inviteTeamMember,
  getTeamMembers,
} from "../controllers/teamController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/team
// Fetch all active members and pending invites
router.get(
  "/",
  requireAuth,
  requireRoles(["superadmin", "admin"]),
  getTeamMembers,
);

// POST /api/team/invite
// Send a new invitation email
router.post(
  "/invite",
  requireAuth,
  requireRoles(["superadmin", "admin"]),
  inviteTeamMember,
);

export default router;
