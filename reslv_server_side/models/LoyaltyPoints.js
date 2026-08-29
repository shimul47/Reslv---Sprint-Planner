import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["earned", "redeemed", "adjusted"],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    // The user whose action triggered this transaction (agent who resolved,
    // customer who left feedback, admin who adjusted, etc.)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

const loyaltyPointsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    redeemedPoints: {
      type: Number,
      default: 0,
    },
    // Conversion rate: how many points equal $1 discount
    pointsPerDollar: {
      type: Number,
      default: 100,
      min: 1,
    },
    transactions: {
      type: [transactionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Helper: available (unspent) balance
loyaltyPointsSchema.virtual("availablePoints").get(function () {
  return this.totalPoints - this.redeemedPoints;
});

loyaltyPointsSchema.set("toJSON", { virtuals: true });
loyaltyPointsSchema.set("toObject", { virtuals: true });

const LoyaltyPoints =
  mongoose.models.LoyaltyPoints ||
  mongoose.model("LoyaltyPoints", loyaltyPointsSchema);

export default LoyaltyPoints;
