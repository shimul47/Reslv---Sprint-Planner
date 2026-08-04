import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", null],
      default: null,
    },
    status: {
      type: String,
      // mirrors Stripe subscription statuses
      enum: [
        "inactive",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
      ],
      default: "inactive",
    },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    stripePriceId: { type: String },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Subscription =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
