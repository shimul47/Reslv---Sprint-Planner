import express from "express";
import {
  acceptInvite,
  getInviteByToken,
} from "../controllers/inviteApiController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";
import { inviteTeamMember } from "../controllers/teamController.js";

const router = express.Router();

router.get("/:token", getInviteByToken);
router.post("/accept", acceptInvite);
router.post(
  "/send",
  requireAuth,
  requireRoles(["superadmin", "admin"]),
  inviteTeamMember,
);

export default router;
