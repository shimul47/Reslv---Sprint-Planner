import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    "⚠️  STRIPE_SECRET_KEY is not set. Add it to your .env before hitting /api/payments routes.",
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export default stripe;
