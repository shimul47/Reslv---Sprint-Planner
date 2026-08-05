import express from "express";
import {
  getDashboardInit,
  createCompanyNode,
  createAdminNode,
  updateAdminNode,
  deleteAdminNode,
} from "../controllers/superadminController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireRoles(["superadmin"]));

router.get("/init", getDashboardInit);
router.post("/companies", createCompanyNode);
router.post("/admins", createAdminNode);
router.put("/admins/:id", updateAdminNode);
router.delete("/admins/:id", deleteAdminNode);

export default router;
