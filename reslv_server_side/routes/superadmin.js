import express from "express";
import {
  getDashboardInit,
  createCompanyNode,
  createAdminNode,
} from "../controllers/superadminController.js";
const router = express.Router();

router.get("/init", getDashboardInit);
router.post("/companies", createCompanyNode);
router.post("/admins", createAdminNode);

export default router;
