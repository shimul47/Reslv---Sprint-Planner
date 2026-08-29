import express from "express";
import { getAdminConfig, updatePrioritizationWeights } from "../controllers/adminConfigController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireRoles(["admin", "superadmin"]));

router.get("/", getAdminConfig);
router.patch("/prioritization-weights", updatePrioritizationWeights);

export default router;
