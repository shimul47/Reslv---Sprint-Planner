import express from "express";
import {
  getTeamMembers,
  inviteTeamMember,
} from "../controllers/teamController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  requireAuth,
  requireRoles(["superadmin", "admin"]),
  getTeamMembers,
);
router.post(
  "/invite",
  requireAuth,
  requireRoles(["superadmin", "admin"]),
  inviteTeamMember,
);

export default router;
