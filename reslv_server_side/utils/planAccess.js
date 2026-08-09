import Subscription from "../models/Subscription.js";
import { TIER_CONFIG } from "../config/plans.js";

// A Stripe subscription doc only reflects real access while its status is
// active/trialing — past_due/canceled/unpaid/inactive fall back to free-tier
// gating even if `plan` still names a paid tier from before it lapsed.
const LIVE_STATUSES = ["active", "trialing"];

// Central plan/feature lookup shared by team invites and ticket features.
// Read-only: unlike getOrCreateSubscriptionForReq, this never creates a
// Subscription doc — "no doc" already means free.
export async function getCompanyPlan(companyId) {
  const sub = await Subscription.findOne({ companyId }).lean();
  const planId = sub && LIVE_STATUSES.includes(sub.status) ? sub.plan : "free";
  const base = TIER_CONFIG[planId] ?? TIER_CONFIG.free;
  const inviteLimit = sub?.inviteLimitOverride ?? base.inviteLimit;

  return {
    id: planId,
    status: sub?.status || "inactive",
    inviteLimit,
    features: base.features,
  };
}

export async function companyHasFeature(companyId, featureKey) {
  const plan = await getCompanyPlan(companyId);
  return Boolean(plan.features[featureKey]);
}
