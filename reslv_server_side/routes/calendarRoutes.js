import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  getAuthUrl,
  oauthCallback,
  getStatus,
  disconnect,
  getAvailability,
} from "../controllers/calendarController.js";

const router = express.Router();

router.get("/auth-url", protect, getAuthUrl);
router.get("/status", protect, getStatus);
router.post("/disconnect", protect, disconnect);
router.get("/availability", protect, getAvailability);

// No protect here — Google redirects the browser directly, no auth header
router.get("/oauth/callback", oauthCallback);

export default router;