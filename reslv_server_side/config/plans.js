// Create these Prices in your Stripe Dashboard (Product catalog -> Add product)
// then paste the price IDs (they look like "price_1Nabc...") into your .env file.
// Test mode and live mode have DIFFERENT price IDs, so make sure you're copying
// from the same mode your STRIPE_SECRET_KEY belongs to.

export const PRICE_IDS = {
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
};

export const PLAN_BY_PRICE_ID = {
  [PRICE_IDS.premium_monthly]: { plan: "premium", billingCycle: "monthly" },
  [PRICE_IDS.premium_yearly]: { plan: "premium", billingCycle: "yearly" },
};
