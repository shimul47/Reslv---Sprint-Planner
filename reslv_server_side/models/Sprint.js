import mongoose from "mongoose";

const sprintSchema = new mongoose.Schema(
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
    goal: { type: String, default: "" },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["planning", "active", "closed"],
      default: "planning",
    },
    // Unpublished sprints are only visible to admin/sprint_planner/managers —
    // employees can't see a sprint (or its tasks) until it's published.
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Data flag only for now — cross-project surfacing to child projects is
    // a phase-2 feature, this just avoids a later migration.
    shareWithSubprojects: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

sprintSchema.index({ projectId: 1, createdAt: -1 });

const Sprint = mongoose.models.Sprint || mongoose.model("Sprint", sprintSchema);

export default Sprint;
