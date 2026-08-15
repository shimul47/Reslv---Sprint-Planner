import mongoose from "mongoose";

const timeLogSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hours: { type: Number, required: true, min: 0 },
    // The task's remainingHours immediately after this log — captured at
    // write time so the hours burndown can be reconstructed by replaying
    // these entries instead of needing a daily snapshot job.
    remainingHoursAfter: { type: Number, default: null },
    spentOn: { type: Date, default: Date.now },
    comment: { type: String, default: "" },
  },
  { timestamps: true },
);

timeLogSchema.index({ taskId: 1, createdAt: -1 });

const TimeLog = mongoose.models.TimeLog || mongoose.model("TimeLog", timeLogSchema);

export default TimeLog;
