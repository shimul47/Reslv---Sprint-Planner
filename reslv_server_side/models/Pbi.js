import mongoose from "mongoose";

const pbiSchema = new mongoose.Schema(
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
    backlogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductBacklog",
      required: true,
      index: true,
    },
    // Set once the PBI is dragged into a Sprint. backlogId is retained as
    // its origin list so it still shows up in the Product Backlog view.
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["feature", "bug", "chore"],
      default: "feature",
    },
    storyPoints: { type: Number, default: null },
    effortHours: { type: Number, default: null },
    status: {
      type: String,
      enum: ["new", "in_progress", "done"],
      default: "new",
    },
    // Set exactly when status transitions to "done", cleared if it moves
    // back — this (not updatedAt, which changes on any edit) is what makes
    // points-burndown/velocity reconstructable from history.
    doneAt: { type: Date, default: null },
    releaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Release",
      default: null,
      index: true,
    },
    position: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

pbiSchema.index({ backlogId: 1, position: 1 });
pbiSchema.index({ sprintId: 1, position: 1 });

const Pbi = mongoose.models.Pbi || mongoose.model("Pbi", pbiSchema);

export default Pbi;
