import stripe from "../config/stripe.js";
import { TIERS, PRICE_IDS, PLAN_BY_PRICE_ID, PLAN_DISPLAY, TIER_CONFIG } from "../config/plans.js";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import { getCompanyPlan } from "../utils/planAccess.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Looks up the requesting user's companyId (current JWTs only carry { id }),
// and returns the Subscription doc for that company, creating a default
// "free" one the first time we see that company.
async function getOrCreateSubscriptionForReq(req) {
  const user = await User.findById(req.user.id);
  if (!user || !user.companyId) {
    throw Object.assign(new Error("User has no associated company"), {
      status: 400,
    });
  }

  let subscription = await Subscription.findOne({ companyId: user.companyId });
  if (!subscription) {
    subscription = await Subscription.create({ companyId: user.companyId });
  }
  return { user, subscription };
}

// POST /api/payments/create-checkout-session
// body: { tier: "starter" | "professional" | "enterprise", billingCycle: "monthly" | "yearly" }
export const createCheckoutSession = async (req, res) => {
  try {
    const { tier, billingCycle } = req.body;
    if (!TIERS.includes(tier)) {
      return res.status(400).json({ message: `tier must be one of: ${TIERS.join(", ")}` });
    }
    if (!["monthly", "yearly"].includes(billingCycle)) {
      return res.status(400).json({ message: "billingCycle must be 'monthly' or 'yearly'" });
    }

    const priceId = PRICE_IDS[`${tier}_${billingCycle}`];
    if (!priceId) {
      return res.status(500).json({
        message: `Missing Stripe price ID for ${tier} ${billingCycle}. Set it in your .env.`,
      });
    }

    const { user, subscription } = await getOrCreateSubscriptionForReq(req);

    // Reuse an existing Stripe customer for this company, or create one.
    let stripeCustomerId = subscription.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.companyName || user.name,
        metadata: { companyId: String(user.companyId) },
      });
      stripeCustomerId = customer.id;
      subscription.stripeCustomerId = stripeCustomerId;
      await subscription.save();
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/billing/cancelled`,
      metadata: { companyId: String(user.companyId) },
      subscription_data: {
        metadata: { companyId: String(user.companyId) },
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("createCheckoutSession error:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Server error" });
  }
};

// POST /api/payments/create-portal-session
// Lets a company manage/cancel their subscription via Stripe's hosted portal.
export const createPortalSession = async (req, res) => {
  try {
    const { subscription } = await getOrCreateSubscriptionForReq(req);
    if (!subscription.stripeCustomerId) {
      return res.status(400).json({ message: "No Stripe customer on file yet" });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${CLIENT_URL}/billing`,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error("createPortalSession error:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Server error" });
  }
};

// GET /api/payments/subscription
// Returns the raw Subscription doc plus the resolved effective plan
// (inviteLimit/features), since Stripe status can make the *effective*
// plan differ from the stored `plan` field (e.g. a lapsed subscription).
export const getSubscription = async (req, res) => {
  try {
    const { user, subscription } = await getOrCreateSubscriptionForReq(req);
    const plan = await getCompanyPlan(user.companyId);
    res.json({ subscription: subscription.toObject(), plan });
  } catch (error) {
    console.error("getSubscription error:", error.message);
    res.status(error.status || 500).json({ message: error.message || "Server error" });
  }
};

// GET /api/payments/plans
// Static tier catalog (pricing + facility list) for rendering the Billing
// page's upgrade cards. Auth-only, no role restriction.
export const getPlans = async (_req, res) => {
  const tiers = TIERS.map((id) => ({
    id,
    inviteLimit: TIER_CONFIG[id].inviteLimit,
    features: TIER_CONFIG[id].features,
    ...PLAN_DISPLAY[id],
  }));
  res.json({ tiers });
};

// POST /api/payments/webhook  (mounted with express.raw(), NOT express.json())
export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription") {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            session.subscription,
          );
          await applySubscriptionUpdate(stripeSubscription);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await applySubscriptionUpdate(event.data.object);
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSubscription = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: stripeSubscription.id },
          {
            plan: "free",
            billingCycle: null,
            status: "canceled",
            cancelAtPeriodEnd: false,
          },
        );
        break;
      }

      default:
        // Ignore other event types (invoice.paid, payment_intent.*, etc.)
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error.message);
    // Return 200 anyway so Stripe doesn't hammer retries for a bug on our
    // side once we've logged it; flip to 500 while you're still debugging.
    res.status(200).json({ received: true, handlerError: error.message });
  }
};

async function applySubscriptionUpdate(stripeSubscription) {
  const priceId = stripeSubscription.items.data[0]?.price?.id;
  let planInfo = PLAN_BY_PRICE_ID[priceId];
  if (!planInfo) {
    console.warn(`applySubscriptionUpdate: unrecognized price ID "${priceId}", defaulting to starter`);
    planInfo = { plan: "starter", billingCycle: null };
  }

  const companyId = stripeSubscription.metadata?.companyId;

  const update = {
    plan: planInfo.plan,
    billingCycle: planInfo.billingCycle,
    status: stripeSubscription.status,
    stripeSubscriptionId: stripeSubscription.id,
    stripeCustomerId: stripeSubscription.customer,
    stripePriceId: priceId,
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
  };

  if (companyId) {
    await Subscription.findOneAndUpdate({ companyId }, update, {
      upsert: true,
      new: true,
    });
  } else {
    // Fallback: match by customer id if metadata somehow wasn't set.
    await Subscription.findOneAndUpdate(
      { stripeCustomerId: stripeSubscription.customer },
      update,
    );
  }
}
