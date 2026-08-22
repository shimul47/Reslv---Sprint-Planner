import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  getPlans,
  syncCheckoutSession,
  handleWebhook,
} from "../controllers/paymentController.js";

const router = express.Router();

// NOTE: the webhook route is mounted separately in server.js with
// express.raw() BEFORE express.json() is applied, since Stripe needs the
// raw request body to verify the signature. It is intentionally not
// registered here to avoid it being double-parsed as JSON.

router.post("/create-checkout-session", requireAuth, createCheckoutSession);
router.post("/create-portal-session", requireAuth, createPortalSession);
router.get("/subscription", requireAuth, getSubscription);
router.get("/plans", requireAuth, getPlans);
router.post("/sync-checkout-session", requireAuth, syncCheckoutSession);

export default router;
export { handleWebhook };
