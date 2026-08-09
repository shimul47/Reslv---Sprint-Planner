// Create these Prices in your Stripe Dashboard (Product catalog -> Add product),
// or run `node scripts/setupStripePrices.js` to create them via the API and
// print a ready-to-paste .env block. Then paste the price IDs (they look like
// "price_1Nabc...") into your .env file.
// Test mode and live mode have DIFFERENT price IDs, so make sure you're copying
// from the same mode your STRIPE_SECRET_KEY belongs to.

export const TIERS = ["starter", "professional", "enterprise"];

// `inviteLimit: null` means unlimited. Feature flags gate Reports, inviting
// the sprint_planner role, and editing custom SLA/support-hours settings.
export const TIER_CONFIG = {
  free: {
    inviteLimit: 5,
    features: { reports: false, sprintPlannerInvite: false, customSlaSettings: false },
  },
  starter: {
    inviteLimit: 30,
    features: { reports: false, sprintPlannerInvite: false, customSlaSettings: false },
  },
  professional: {
    inviteLimit: 70,
    features: { reports: true, sprintPlannerInvite: true, customSlaSettings: false },
  },
  enterprise: {
    inviteLimit: null,
    features: { reports: true, sprintPlannerInvite: true, customSlaSettings: true },
  },
};

export function isUnlimited(limit) {
  return limit === null || limit === undefined;
}

export const PRICE_IDS = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
  starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
  professional_monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
  professional_yearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY,
  enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  enterprise_yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
};

export const PLAN_BY_PRICE_ID = Object.entries(PRICE_IDS).reduce((acc, [key, priceId]) => {
  if (!priceId) return acc;
  const lastUnderscore = key.lastIndexOf("_");
  const plan = key.slice(0, lastUnderscore);
  const billingCycle = key.slice(lastUnderscore + 1);
  acc[priceId] = { plan, billingCycle };
  return acc;
}, {});

// Display metadata for the client Billing page. Prices are in whole USD.
export const PLAN_DISPLAY = {
  starter: {
    label: "Starter",
    tagline: "Ticketing, board, and the ticket-task bridge.",
    monthlyUsd: 29,
    yearlyUsd: 290,
  },
  professional: {
    label: "Professional",
    tagline: "Adds reporting and Sprint Planner access.",
    monthlyUsd: 79,
    yearlyUsd: 790,
  },
  enterprise: {
    label: "Enterprise",
    tagline: "Adds custom SLA targets and support-hours settings.",
    monthlyUsd: 199,
    yearlyUsd: 1990,
  },
};
