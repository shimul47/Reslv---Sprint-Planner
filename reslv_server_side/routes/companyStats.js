import express from "express";
import { getCompanyStats } from "../controllers/companyStatsController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);
router.get("/company-stats", requireRoles(["admin", "superadmin"]), getCompanyStats);

export default router;
