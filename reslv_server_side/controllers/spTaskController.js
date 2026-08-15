import Task from "../models/Task.js";
import Pbi from "../models/Pbi.js";
import Sprint from "../models/Sprint.js";
import TimeLog from "../models/TimeLog.js";
import TaskRequest from "../models/TaskRequest.js";
import ProjectMember from "../models/ProjectMember.js";
import { isOverseer } from "../middleware/projectAccess.js";

function canManage(req) {
  return isOverseer(req.user) || req.projectMember?.projectRole === "manager";
}

export const createTask = async (req, res) => {
  try {
    const { pbiId, sprintId, title, description, assigneeId, estimateHours } = req.body;
    if (!pbiId || !sprintId || !title?.trim()) {
      return res.status(400).json({ message: "pbiId, sprintId, and title are required." });
    }

    const [pbi, sprint] = await Promise.all([
      Pbi.findOne({ _id: pbiId, projectId: req.project._id }),
      Sprint.findOne({ _id: sprintId, projectId: req.project._id }),
    ]);
    if (!pbi || !sprint) {
      return res.status(404).json({ message: "PBI or sprint not found." });
    }

    const count = await Task.countDocuments({ sprintId, status: "todo" });
    const task = await Task.create({
      pbiId,
      sprintId,
      projectId: req.project._id,
      companyId: req.project.companyId,
      title: title.trim(),
      description: description?.trim() || "",
      assigneeId: assigneeId || null,
      estimateHours: estimateHours ?? null,
      remainingHours: estimateHours ?? null,
      position: count,
      createdBy: req.user.id,
    });

    res.status(201).json({ task });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Failed to create task." });
  }
};

// General PATCH, but the allowed fields depend on who's asking: a manager/
// overseer can edit anything, while the task's own assignee (a plain
// employee) may only move it across the board and update its remaining
// hours — enough to run the sprint board's drag & drop + inline time log,
// without letting them reassign or retitle work that isn't theirs.
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, projectId: req.project._id });
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const isManager = canManage(req);
    const isSelfAssignee = String(task.assigneeId || "") === String(req.user.id);
    if (!isManager && !isSelfAssignee) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (req.body.status !== undefined) {
      if (!["todo", "in_progress", "done"].includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid status." });
      }
      // doneAt is the source of truth for cycle-time stats — set exactly on
      // the todo/in_progress -> done transition, cleared if it moves back.
      if (req.body.status === "done" && task.status !== "done") task.doneAt = new Date();
      else if (req.body.status !== "done" && task.status === "done") task.doneAt = null;
      task.status = req.body.status;
    }
    if (req.body.position !== undefined) task.position = req.body.position;
    if (req.body.remainingHours !== undefined) task.remainingHours = req.body.remainingHours;

    if (isManager) {
      if (req.body.title !== undefined) task.title = req.body.title.trim();
      if (req.body.description !== undefined) task.description = req.body.description.trim();
      if (req.body.assigneeId !== undefined) task.assigneeId = req.body.assigneeId || null;
      if (req.body.estimateHours !== undefined) task.estimateHours = req.body.estimateHours;
      if (req.body.sprintId !== undefined) task.sprintId = req.body.sprintId;
    }

    await task.save();
    res.json({ task });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Failed to update task." });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.taskId, projectId: req.project._id });
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }
    await Promise.all([
      TimeLog.deleteMany({ taskId: task._id }),
      TaskRequest.deleteMany({ taskId: task._id }),
    ]);
    res.json({ message: "Task deleted.", id: task._id });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Failed to delete task." });
  }
};

// ── Time logging directly on the sprint board ───────────────────────────────

export const listTimeLogs = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, projectId: req.project._id });
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }
    const logs = await TimeLog.find({ taskId: task._id })
      .sort({ createdAt: -1 })
      .populate("userId", "name")
      .lean();
    res.json({ logs });
  } catch (error) {
    console.error("List time logs error:", error);
    res.status(500).json({ message: "Failed to load time logs." });
  }
};

export const logTime = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, projectId: req.project._id });
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const isSelfAssignee = String(task.assigneeId || "") === String(req.user.id);
    if (!canManage(req) && !isSelfAssignee) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { hours, remainingHours, comment, spentOn } = req.body;
    if (hours === undefined || hours === null || Number(hours) < 0) {
      return res.status(400).json({ message: "hours is required." });
    }

    // Captures the task's resulting remainingHours on the log entry itself
    // (even when this call didn't change it) so the hours burndown can be
    // reconstructed later purely by replaying TimeLog history in order.
    const resultingRemaining = remainingHours !== undefined ? remainingHours : task.remainingHours;

    const log = await TimeLog.create({
      taskId: task._id,
      projectId: req.project._id,
      companyId: req.project.companyId,
      userId: req.user.id,
      hours: Number(hours),
      remainingHoursAfter: resultingRemaining ?? null,
      spentOn: spentOn || new Date(),
      comment: comment?.trim() || "",
    });

    if (remainingHours !== undefined) {
      task.remainingHours = remainingHours;
      await task.save();
    }

    res.status(201).json({ log, task });
  } catch (error) {
    console.error("Log time error:", error);
    res.status(500).json({ message: "Failed to log time." });
  }
};

// ── Task requests: employee-to-employee handoff ─────────────────────────────

// A task's current assignee (or a manager/overseer) can ask another project
// member to take it over — this is the "employee can pass a request to
// another employee of the company" workflow.
export const createTaskRequest = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, projectId: req.project._id });
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const isSelfAssignee = String(task.assigneeId || "") === String(req.user.id);
    if (!canManage(req) && !isSelfAssignee) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { toUserId, message } = req.body;
    if (!toUserId) {
      return res.status(400).json({ message: "toUserId is required." });
    }
    if (String(toUserId) === String(req.user.id)) {
      return res.status(400).json({ message: "Cannot request yourself." });
    }

    const targetMember = await ProjectMember.findOne({
      projectId: req.project._id,
      userId: toUserId,
    });
    if (!targetMember) {
      return res.status(404).json({ message: "That teammate isn't on this project." });
    }

    const request = await TaskRequest.create({
      taskId: task._id,
      projectId: req.project._id,
      companyId: req.project.companyId,
      fromUserId: req.user.id,
      toUserId,
      message: message?.trim() || "",
    });

    res.status(201).json({ request });
  } catch (error) {
    console.error("Create task request error:", error);
    res.status(500).json({ message: "Failed to send task request." });
  }
};

// Global inbox (not project-nested) — a user's incoming/outgoing task
// requests across every project they touch.
export const listMyTaskRequests = async (req, res) => {
  try {
    const requests = await TaskRequest.find({
      $or: [{ toUserId: req.user.id }, { fromUserId: req.user.id }],
    })
      .sort({ createdAt: -1 })
      .populate("taskId", "title")
      .populate("fromUserId", "name email")
      .populate("toUserId", "name email")
      .populate("projectId", "name")
      .lean();
    res.json({ requests });
  } catch (error) {
    console.error("List task requests error:", error);
    res.status(500).json({ message: "Failed to load task requests." });
  }
};

export const resolveTaskRequest = async (req, res) => {
  try {
    const { decision } = req.body; // "accept" | "decline"
    if (!["accept", "decline"].includes(decision)) {
      return res.status(400).json({ message: "decision must be accept or decline." });
    }

    const request = await TaskRequest.findById(req.params.requestId);
    if (!request || String(request.toUserId) !== String(req.user.id)) {
      return res.status(404).json({ message: "Task request not found." });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "This request has already been resolved." });
    }

    request.status = decision === "accept" ? "accepted" : "declined";
    request.resolvedAt = new Date();
    await request.save();

    if (decision === "accept") {
      await Task.findByIdAndUpdate(request.taskId, { assigneeId: request.toUserId });
    }

    res.json({ request });
  } catch (error) {
    console.error("Resolve task request error:", error);
    res.status(500).json({ message: "Failed to resolve task request." });
  }
};
