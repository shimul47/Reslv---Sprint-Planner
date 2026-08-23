import mongoose from "mongoose";

const taskRequestSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: { type: String, default: "", trim: true },
    // Hours the sender already put in before asking for a handoff — 0 if
    // they hadn't started yet. Gets moved onto the task's hoursLog once
    // this request is accepted, so those hours stay theirs.
    hoursSpent: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
    },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

taskRequestSchema.index({ toUserId: 1, status: 1 });

const TaskRequest =
  mongoose.models.TaskRequest || mongoose.model("TaskRequest", taskRequestSchema);

export default TaskRequest;
