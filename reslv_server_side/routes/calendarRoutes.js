import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getAuthUrl,
  oauthCallback,
  getStatus,
  disconnect,
  getAvailability,
} from "../controllers/calendarController.js";

const router = express.Router();

router.get("/auth-url", requireAuth, getAuthUrl);
router.get("/status", requireAuth, getStatus);
router.post("/disconnect", requireAuth, disconnect);
router.get("/availability", requireAuth, getAvailability);

// No requireAuth here — Google redirects the browser directly, no auth header
router.get("/oauth/callback", oauthCallback);

export default router;