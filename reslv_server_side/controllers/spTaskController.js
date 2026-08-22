import Sprint from "../models/Sprint.js";
import Task from "../models/Task.js";
import TaskRequest from "../models/TaskRequest.js";
import User from "../models/User.js";
import Company from "../models/Company.js";
import { resolveCompanyId } from "../utils/companyScope.js";

const OVERSEER_ROLES = ["admin", "superadmin", "sprint_planner"];
const isOverseer = (user) => Boolean(user?.roles?.some((r) => OVERSEER_ROLES.includes(r)));

// Route is gated to OVERSEER_ROLES in routes/sprintPlanner.js.
export const createTask = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }

    const sprint = await Sprint.findOne({ _id: req.params.sprintId, companyId });
    if (!sprint) {
      return res.status(404).json({ message: "Sprint not found." });
    }

    const { title, description, taskType, priority, approximateHours, assigneeId, segmentId } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required." });
    }
    if (approximateHours === undefined || approximateHours === null || Number(approximateHours) < 0) {
      return res.status(400).json({ message: "approximateHours is required." });
    }

    const count = await Task.countDocuments({ sprintId: sprint._id, status: "todo" });
    const task = await Task.create({
      sprintId: sprint._id,
      companyId,
      title: title.trim(),
      description: description?.trim() || "",
      taskType: taskType || "new_feature",
      priority: priority || "medium",
      assigneeId: assigneeId || null,
      segmentId: segmentId || null,
      approximateHours: Number(approximateHours),
      position: count,
      createdBy: req.user.id,
    });

    res.status(201).json({ task });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Failed to create task." });
  }
};

// Overseer-only content/reassignment edits, plus board drag-and-drop
// (status limited to todo <-> in_progress — "done" only happens through
// completeTask, since that's the only place actualHours gets captured).
export const updateTask = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }

    const task = await Task.findOne({ _id: req.params.id, companyId });
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    if (req.body.status !== undefined) {
      if (!["todo", "in_progress"].includes(req.body.status)) {
        return res.status(400).json({ message: "Use the complete endpoint to mark a task done." });
      }
      task.status = req.body.status;
      if (req.body.status === "in_progress" && !task.startedAt) task.startedAt = new Date();
    }
    if (req.body.position !== undefined) task.position = req.body.position;
    if (req.body.title !== undefined) task.title = req.body.title.trim();
    if (req.body.description !== undefined) task.description = req.body.description.trim();
    if (req.body.taskType !== undefined) task.taskType = req.body.taskType;
    if (req.body.priority !== undefined) task.priority = req.body.priority;
    if (req.body.assigneeId !== undefined) task.assigneeId = req.body.assigneeId || null;
    if (req.body.segmentId !== undefined) task.segmentId = req.body.segmentId || null;
    if (req.body.approximateHours !== undefined) task.approximateHours = Number(req.body.approximateHours);

    await task.save();
    res.json({ task });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Failed to update task." });
  }
};

// Completed work is kept for the record (analytics, cycle-time stats) — a
// "done" task can't be deleted, since there's no way to reopen it either.
export const deleteTask = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }

    const task = await Task.findOne({ _id: req.params.id, companyId });
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }
    if (task.status === "done") {
      return res.status(409).json({ message: "A completed task can't be deleted." });
    }

    await task.deleteOne();
    await TaskRequest.deleteMany({ taskId: task._id });
    res.json({ message: "Task deleted.", id: task._id });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Failed to delete task." });
  }
};

// The employee-facing task list: only tasks assigned to me, only from
// published sprints — this is the actual enforcement point for "an employee
// only sees their own assigned work," not just a client-side filter.
// Only the most recently published sprint is shown — publishing a new
// sprint is what clears an employee's view of the previous one, so nothing
// extra needs to happen when the old sprint isn't explicitly closed.
export const listMyTasks = async (req, res) => {
  try {
    const currentSprint = await Sprint.findOne({
      companyId: req.user.companyId,
      published: true,
    })
      .sort({ publishedAt: -1 })
      .select("_id name status startDate endDate")
      .lean();

    if (!currentSprint) {
      return res.json({ tasks: [] });
    }

    const tasks = await Task.find({
      assigneeId: req.user.id,
      sprintId: currentSprint._id,
    })
      .sort({ status: 1, updatedAt: -1 })
      .lean();

    const withSprint = tasks.map((task) => ({ ...task, sprint: currentSprint }));

    res.json({ tasks: withSprint });
  } catch (error) {
    console.error("List my tasks error:", error);
    res.status(500).json({ message: "Failed to load your tasks." });
  }
};

// Lets a task's own assignee see teammates' remaining hours before
// diverting it to one of them — the same shape as spSprintController's
// getSprintCapacity (overseer-only), scoped down to a task the caller
// actually owns instead of requiring the overseer role.
export const getTaskCapacity = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }
    if (String(task.assigneeId || "") !== String(req.user.id) && !isOverseer(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const [company, sprint, users, sprintTasks] = await Promise.all([
      Company.findById(task.companyId).select("defaultSprintHours").lean(),
      Sprint.findById(task.sprintId).select("capacityHoursOverride").lean(),
      User.find({ companyId: task.companyId, roles: { $ne: "customer" } })
        .select("name email")
        .lean(),
      Task.find({ sprintId: task.sprintId, assigneeId: { $ne: null }, _id: { $ne: task._id } })
        .select("assigneeId approximateHours")
        .lean(),
    ]);

    const allocatedByUser = new Map();
    for (const t of sprintTasks) {
      const key = String(t.assigneeId);
      allocatedByUser.set(key, (allocatedByUser.get(key) || 0) + (t.approximateHours || 0));
    }

    const defaultSprintHours = company?.defaultSprintHours ?? 60;
    const capacityHours = sprint?.capacityHoursOverride ?? defaultSprintHours;
    const employees = users.map((user) => {
      const allocatedHours = allocatedByUser.get(String(user._id)) || 0;
      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        capacityHours,
        allocatedHours,
        remainingHours: capacityHours - allocatedHours,
      };
    });

    res.json({ sprintId: task.sprintId, defaultSprintHours, employees });
  } catch (error) {
    console.error("Get task capacity error:", error);
    res.status(500).json({ message: "Failed to load capacity." });
  }
};

export const attemptTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }
    if (String(task.assigneeId || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (task.status !== "todo") {
      return res.status(409).json({ message: "This task has already been started." });
    }

    const sprint = await Sprint.findById(task.sprintId).select("published").lean();
    if (!sprint?.published) {
      return res.status(404).json({ message: "Task not found." });
    }

    task.status = "in_progress";
    task.startedAt = new Date();
    await task.save();

    res.json({ task });
  } catch (error) {
    console.error("Attempt task error:", error);
    res.status(500).json({ message: "Failed to attempt task." });
  }
};

export const completeTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const isSelfAssignee = String(task.assigneeId || "") === String(req.user.id);
    if (!isSelfAssignee && !isOverseer(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (task.status === "done") {
      return res.status(409).json({ message: "This task is already done." });
    }

    const { actualHours } = req.body;
    if (actualHours === undefined || actualHours === null || Number(actualHours) < 0) {
      return res.status(400).json({ message: "actualHours is required." });
    }

    task.status = "done";
    task.doneAt = new Date();
    task.actualHours = Number(actualHours);
    await task.save();

    res.json({ task });
  } catch (error) {
    console.error("Complete task error:", error);
    res.status(500).json({ message: "Failed to complete task." });
  }
};
