import express from "express";
import {
  listSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  updateSegmentMembers,
} from "../controllers/segmentController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

// Any overseer can read the segment list (needed to filter the assignee
// picker); only an admin/superadmin can change the org structure itself.
const OVERSEER_ROLES = ["admin", "superadmin", "sprint_planner"];
const adminOnly = requireRoles(["admin", "superadmin"]);

router.get("/", requireRoles(OVERSEER_ROLES), listSegments);
router.post("/", adminOnly, createSegment);
router.patch("/:id", adminOnly, updateSegment);
router.patch("/:id/members", adminOnly, updateSegmentMembers);
router.delete("/:id", adminOnly, deleteSegment);

export default router;
