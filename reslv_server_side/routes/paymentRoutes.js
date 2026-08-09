import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  getPlans,
  handleWebhook,
} from "../controllers/paymentController.js";

const router = express.Router();

// NOTE: the webhook route is mounted separately in server.js with
// express.raw() BEFORE express.json() is applied, since Stripe needs the
// raw request body to verify the signature. It is intentionally not
// registered here to avoid it being double-parsed as JSON.

router.post("/create-checkout-session", protect, createCheckoutSession);
router.post("/create-portal-session", protect, createPortalSession);
router.get("/subscription", protect, getSubscription);
router.get("/plans", protect, getPlans);

export default router;
export { handleWebhook };
