import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
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
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    taskType: {
      type: String,
      enum: ["new_feature", "bug", "improvement", "chore"],
      default: "new_feature",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    // Which team this task belongs to — chosen explicitly by the sprint
    // planner (defaults to the assignee's segment client-side), independent
    // of the assignee so it survives a later reassignment/diversion.
    segmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Segment",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "done"],
      default: "todo",
    },
    approximateHours: { type: Number, required: true, min: 0 },
    // Only ever set once, on completeTask — the employee's self-reported
    // actual time, compared against approximateHours on the analytics page.
    actualHours: { type: Number, default: null, min: 0 },
    // Set on "attempt" — when the assignee starts working the task.
    startedAt: { type: Date, default: null },
    // Set exactly when status transitions to "done" — powers cycle-time
    // stats without guessing from updatedAt.
    doneAt: { type: Date, default: null },
    // Who actually put hours into this task, and how many. Grows by one
    // entry whenever someone hands the task off mid-work (their hours so
    // far get banked here) and once more when the task is finished — so
    // credit doesn't all land on whoever happened to finish it.
    hoursLog: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        hours: { type: Number, required: true, min: 0 },
      },
    ],
    // Other tasks (same sprint) that must be "done" before this one can be
    // started — kept simple on purpose: no separate blocking-relationship
    // model, just a list of task ids this one waits on.
    dependsOn: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
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
taskSchema.index({ companyId: 1, assigneeId: 1 });

const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);

export default Task;
