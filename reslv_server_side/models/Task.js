import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    pbiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pbi",
      required: true,
      index: true,
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      required: true,
      index: true,
    },
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
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "done"],
      default: "todo",
    },
    estimateHours: { type: Number, default: null },
    remainingHours: { type: Number, default: null },
    // Set exactly when status transitions to "done", cleared if it moves
    // back — powers cycle-time stats without guessing from updatedAt.
    doneAt: { type: Date, default: null },
    position: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

taskSchema.index({ sprintId: 1, status: 1, position: 1 });
taskSchema.index({ sprintId: 1, assigneeId: 1 });

const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);

export default Task;
