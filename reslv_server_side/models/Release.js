import mongoose from "mongoose";

const releaseSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    targetDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["planning", "released"],
      default: "planning",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

releaseSchema.index({ projectId: 1, createdAt: -1 });

const Release = mongoose.models.Release || mongoose.model("Release", releaseSchema);

export default Release;
