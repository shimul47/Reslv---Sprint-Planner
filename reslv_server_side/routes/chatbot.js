import express from "express";
import { createSession, sendMessage, handoff } from "../controllers/chatbotController.js";
import { optionalCustomerAuth } from "../middleware/customerAuth.js";

const router = express.Router();

// Not plan-gated — the chatbot is a self-serve deflection tool available on
// every tier, unlike the Professional/Enterprise-gated reporting features.
router.use(optionalCustomerAuth);

router.post("/sessions", createSession);
router.post("/sessions/:id/messages", sendMessage);
router.post("/sessions/:id/handoff", handoff);

export default router;
