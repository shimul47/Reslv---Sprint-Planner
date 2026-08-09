import express from "express";
import {
  getDashboardInit,
  createCompanyNode,
  updateAdminNode,
  deleteAdminNode,
} from "../controllers/superadminController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireRoles(["superadmin"]));

router.get("/init", getDashboardInit);
router.post("/companies", createCompanyNode);
// Admin provisioning now goes through POST /api/team/invite (invite+email
// flow) instead of direct creation — see teamController.inviteTeamMember.
router.put("/admins/:id", updateAdminNode);
router.delete("/admins/:id", deleteAdminNode);

export default router;
