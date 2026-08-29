import express from "express";
import {
  getSummary,
  getLeaderboard,
  updateSettings,
  adjustPoints,
  redeemPoints,
} from "../controllers/loyaltyController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const ADMIN_ROLES = ["superadmin", "admin"];

const router = express.Router();

router.use(requireAuth);

router.get("/summary", getSummary);
router.get("/leaderboard", requireRoles(ADMIN_ROLES), getLeaderboard);
router.put("/settings", requireRoles(ADMIN_ROLES), updateSettings);
router.post("/adjust", requireRoles(ADMIN_ROLES), adjustPoints);
router.post("/redeem", requireRoles(ADMIN_ROLES), redeemPoints);

export default router;
