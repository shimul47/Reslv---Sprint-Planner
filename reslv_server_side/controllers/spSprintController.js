import Sprint from "../models/Sprint.js";
import Task from "../models/Task.js";
import TaskRequest from "../models/TaskRequest.js";
import User from "../models/User.js";
import Company from "../models/Company.js";
import { resolveCompanyId } from "../utils/companyScope.js";

// Every route in this controller is already gated to OVERSEER_ROLES
// (admin/superadmin/sprint_planner) in routes/sprintPlanner.js — employees
// never call these, they only ever see GET /tasks/my.

async function loadCompanySprint(req, res) {
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    res.status(400).json({ message: "companyId is required." });
    return null;
  }
  const sprint = await Sprint.findOne({ _id: req.params.id, companyId });
  if (!sprint) {
    res.status(404).json({ message: "Sprint not found." });
    return null;
  }
  return sprint;
}

export const listSprints = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }
    const sprints = await Sprint.find({ companyId }).sort({ createdAt: -1 }).lean();
    res.json({ sprints });
  } catch (error) {
    console.error("List sprints error:", error);
    res.status(500).json({ message: "Failed to load sprints." });
  }
};

export const createSprint = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }
    const { name, goal, startDate, endDate } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Sprint name is required." });
    }

    const sprint = await Sprint.create({
      companyId,
      name: name.trim(),
      goal: goal?.trim() || "",
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: req.user.id,
    });

    res.status(201).json({ sprint });
  } catch (error) {
    console.error("Create sprint error:", error);
    res.status(500).json({ message: "Failed to create sprint." });
  }
};

export const getSprint = async (req, res) => {
  const sprint = await loadCompanySprint(req, res);
  if (!sprint) return;
  res.json({ sprint });
};

export const updateSprint = async (req, res) => {
  try {
    const sprint = await loadCompanySprint(req, res);
    if (!sprint) return;

    const { name, goal, startDate, endDate, status, capacityHoursOverride } = req.body;
    if (name !== undefined) sprint.name = name.trim();
    if (goal !== undefined) sprint.goal = goal.trim();
    if (startDate !== undefined) sprint.startDate = startDate || null;
    if (endDate !== undefined) sprint.endDate = endDate || null;
    if (status !== undefined) {
      if (!["planning", "active", "closed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
      }
      sprint.status = status;
    }
    if (capacityHoursOverride !== undefined) {
      if (capacityHoursOverride !== null && Number(capacityHoursOverride) < 0) {
        return res.status(400).json({ message: "capacityHoursOverride must be a non-negative number or null." });
      }
      sprint.capacityHoursOverride = capacityHoursOverride === null ? null : Number(capacityHoursOverride);
    }

    await sprint.save();
    res.json({ sprint });
  } catch (error) {
    console.error("Update sprint error:", error);
    res.status(500).json({ message: "Failed to update sprint." });
  }
};

export const publishSprint = async (req, res) => {
  try {
    const sprint = await loadCompanySprint(req, res);
    if (!sprint) return;

    sprint.published = true;
    sprint.publishedAt = new Date();
    sprint.publishedBy = req.user.id;
    await sprint.save();

    res.json({ sprint });
  } catch (error) {
    console.error("Publish sprint error:", error);
    res.status(500).json({ message: "Failed to publish sprint." });
  }
};

export const deleteSprint = async (req, res) => {
  try {
    const sprint = await loadCompanySprint(req, res);
    if (!sprint) return;

    await Promise.all([
      Task.deleteMany({ sprintId: sprint._id }),
      TaskRequest.deleteMany({ sprintId: sprint._id }),
    ]);
    await sprint.deleteOne();
    res.json({ message: "Sprint deleted.", id: sprint._id });
  } catch (error) {
    console.error("Delete sprint error:", error);
    res.status(500).json({ message: "Failed to delete sprint." });
  }
};

export const getSprintBoard = async (req, res) => {
  try {
    const sprint = await loadCompanySprint(req, res);
    if (!sprint) return;

    const tasks = await Task.find({ sprintId: sprint._id })
      .sort({ status: 1, position: 1 })
      .populate("assigneeId", "name email")
      .populate("dependsOn", "title status")
      .lean();

    res.json({ sprint, tasks });
  } catch (error) {
    console.error("Get sprint board error:", error);
    res.status(500).json({ message: "Failed to load sprint board." });
  }
};

// Powers the assignee picker: every employee in the sprint's company, their
// effective capacity, how much of it is already allocated in this sprint,
// and what's left. excludeTaskId lets the create/edit modal exclude the
// task currently being edited from its own assignee's allocation.
export const getSprintCapacity = async (req, res) => {
  try {
    const sprint = await loadCompanySprint(req, res);
    if (!sprint) return;

    const [company, users, tasks] = await Promise.all([
      Company.findById(sprint.companyId).select("defaultSprintHours").lean(),
      User.find({ companyId: sprint.companyId, roles: { $ne: "customer" } })
        .select("name email segmentId")
        .lean(),
      Task.find({
        sprintId: sprint._id,
        assigneeId: { $ne: null },
        ...(req.query.excludeTaskId ? { _id: { $ne: req.query.excludeTaskId } } : {}),
      })
        .select("assigneeId approximateHours")
        .lean(),
    ]);

    const allocatedByUser = new Map();
    for (const task of tasks) {
      const key = String(task.assigneeId);
      allocatedByUser.set(key, (allocatedByUser.get(key) || 0) + (task.approximateHours || 0));
    }

    // This sprint's own capacity override (if the admin set one) takes
    // precedence over the company default — and only for this sprint, since
    // a new sprint's capacityHoursOverride always starts back at null.
    const defaultSprintHours = company?.defaultSprintHours ?? 60;
    const capacityHours = sprint.capacityHoursOverride ?? defaultSprintHours;
    const employees = users.map((user) => {
      const allocatedHours = allocatedByUser.get(String(user._id)) || 0;
      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        segmentId: user.segmentId || null,
        capacityHours,
        allocatedHours,
        remainingHours: capacityHours - allocatedHours,
      };
    });

    res.json({
      sprintId: sprint._id,
      defaultSprintHours,
      capacityHoursOverride: sprint.capacityHoursOverride ?? null,
      capacityHours,
      employees,
    });
  } catch (error) {
    console.error("Get sprint capacity error:", error);
    res.status(500).json({ message: "Failed to load sprint capacity." });
  }
};


export const getSprintStats = async (req, res) => {
  try {
    const sprint = await loadCompanySprint(req, res);
    if (!sprint) return;

    const tasks = await Task.find({ sprintId: sprint._id }).lean();

    const taskStatusCounts = { todo: 0, in_progress: 0, done: 0 };
    for (const task of tasks) taskStatusCounts[task.status] = (taskStatusCounts[task.status] || 0) + 1;

    const doneTasks = tasks.filter((t) => t.doneAt);
    const avgCycleTimeHours = doneTasks.length
      ? doneTasks.reduce((sum, t) => sum + (new Date(t.doneAt) - new Date(t.createdAt)) / 3_600_000, 0) /
        doneTasks.length
      : null;

    const totalApproximateHours = tasks.reduce((sum, t) => sum + (t.approximateHours || 0), 0);
    const totalActualHoursSoFar = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

    res.json({
      taskCount: tasks.length,
      taskStatusCounts,
      avgCycleTimeHours,
      totalApproximateHours,
      totalActualHoursSoFar,
    });
  } catch (error) {
    console.error("Get sprint stats error:", error);
    res.status(500).json({ message: "Failed to compute sprint stats." });
  }
};
