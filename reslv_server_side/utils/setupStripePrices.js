// One-off provisioning script — creates the 3 subscription-tier Products and
// their 6 Prices (monthly + yearly each) in your Stripe account, then prints
// a ready-to-paste .env block.
//
// Usage: node scripts/setupStripePrices.js
// Run once per Stripe mode (test, then live) — STRIPE_SECRET_KEY in your
// .env determines which mode you're provisioning. Safe to rerun: existing
// products/prices are reused rather than duplicated.
//
// Adjust amounts/currency below before running if you want different
// pricing than the defaults.

import "dotenv/config";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is not set in your .env. Aborting.");
  process.exit(1);
}

const CURRENCY = "usd";

const TIERS = [
  { id: "starter", name: "Starter", monthlyUsd: 29, yearlyUsd: 290 },
  { id: "professional", name: "Professional", monthlyUsd: 79, yearlyUsd: 790 },
  { id: "enterprise", name: "Enterprise", monthlyUsd: 199, yearlyUsd: 1990 },
];

async function findOrCreateProduct(tier) {
  const existing = await stripe.products.search({
    query: `metadata['tier']:'${tier.id}' AND active:'true'`,
  });
  if (existing.data[0]) return existing.data[0];

  return stripe.products.create({
    name: `Reslv ${tier.name}`,
    metadata: { tier: tier.id },
  });
}

async function findOrCreatePrice(product, tier, cycle) {
  const amount = cycle === "monthly" ? tier.monthlyUsd : tier.yearlyUsd;
  const interval = cycle === "monthly" ? "month" : "year";

  const existing = await stripe.prices.list({ product: product.id, active: true });
  const match = existing.data.find(
    (p) => p.unit_amount === amount * 100 && p.recurring?.interval === interval,
  );
  if (match) return match;

  return stripe.prices.create(
    {
      product: product.id,
      currency: CURRENCY,
      unit_amount: amount * 100,
      recurring: { interval },
      metadata: { tier: tier.id, cycle },
    },
    { idempotencyKey: `reslv-price-${tier.id}-${cycle}` },
  );
}

async function main() {
  const envLines = [];

  for (const tier of TIERS) {
    const product = await findOrCreateProduct(tier);
    console.log(`Product ready: ${product.name} (${product.id})`);

    for (const cycle of ["monthly", "yearly"]) {
      const price = await findOrCreatePrice(product, tier, cycle);
      console.log(`  ${cycle}: ${price.id}`);
      envLines.push(
        `STRIPE_PRICE_${tier.id.toUpperCase()}_${cycle.toUpperCase()}=${price.id}`,
      );
    }
  }

  console.log("\nPaste this into your .env:\n");
  console.log(envLines.join("\n"));
}

main().catch((err) => {
  console.error("setupStripePrices failed:", err.message);
  process.exit(1);
});
