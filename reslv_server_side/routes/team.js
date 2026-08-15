import express from "express";
import {
  getTeamMembers,
  inviteTeamMember,
  updateMemberRoles,
  removeMember,
  revokeInvite,
  getSprintPlannerSettings,
  updateSprintPlannerSettings,
} from "../controllers/teamController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireRoles(["superadmin", "admin"]));

router.get("/", getTeamMembers);
router.get("/sprint-planner-settings", getSprintPlannerSettings);
router.patch("/sprint-planner-settings", updateSprintPlannerSettings);
router.post("/invite", inviteTeamMember);
router.delete("/invites/:inviteId", revokeInvite);
router.patch("/:userId/roles", updateMemberRoles);
router.delete("/:userId", removeMember);

export default router;
