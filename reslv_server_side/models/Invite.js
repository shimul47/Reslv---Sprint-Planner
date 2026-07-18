const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    roles: [
      {
        type: String,
        enum: ["admin", "agent", "sprint_planner"],
        required: true,
      },
    ],
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Invite", inviteSchema);
