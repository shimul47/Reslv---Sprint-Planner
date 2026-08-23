import mongoose from "mongoose";

const sprintSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    goal: { type: String, default: "" },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["planning", "active", "closed"],
      default: "planning",
    },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    capacityHoursOverride: { type: Number, default: null, min: 0 },
  },
  { timestamps: true },
);

sprintSchema.index({ companyId: 1, createdAt: -1 });

const Sprint = mongoose.models.Sprint || mongoose.model("Sprint", sprintSchema);

export default Sprint;
