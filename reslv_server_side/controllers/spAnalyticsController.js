import Task from "../models/Task.js";
import Sprint from "../models/Sprint.js";
import TaskRequest from "../models/TaskRequest.js";
import { resolveCompanyId } from "../utils/companyScope.js";

// Approximate vs. actual hours, per employee and per sprint — only "done"
// tasks are included, since actualHours is only meaningful once a task is
// complete. Gated to OVERSEER_ROLES in routes/sprintPlanner.js.
export const getAnalytics = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }

    const filter = { companyId, status: "done" };
    if (req.query.employeeId) filter.assigneeId = req.query.employeeId;
    if (req.query.sprintId) filter.sprintId = req.query.sprintId;

    // every accepted handoff for this company (and sprint, if filtered) —
    // this is where "picked up from someone" and "diverted away" come from,
    // separate from the Task query since a diverted task no longer belongs
    // to the person who diverted it
    const handoffFilter = { companyId, status: "accepted" };
    if (req.query.sprintId) handoffFilter.sprintId = req.query.sprintId;
    const handoffs = await TaskRequest.find(handoffFilter)
      .populate("fromUserId", "name email")
      .select("taskId fromUserId toUserId hoursSpent")
      .lean();

    // taskId+userId pairs that came from a handoff, so we can tell "did
    // their own work" apart from "picked up someone else's work" below
    const pickedUpFrom = new Set(handoffs.map((h) => `${h.taskId}:${h.toUserId}`));

    const tasks = await Task.find(filter)
      .populate("assigneeId", "name email")
      .populate("sprintId", "name")
      .populate("hoursLog.userId", "name email")
      .sort({ doneAt: -1 })
      .lean();

    const byEmployeeMap = new Map();
    const bySprintMap = new Map();

    // gets (or starts) this employee's running totals in byEmployeeMap
    const employeeEntry = (user) => {
      const key = String(user._id);
      if (!byEmployeeMap.has(key)) {
        byEmployeeMap.set(key, {
          userId: user._id,
          name: user.name,
          approximateHours: 0,
          actualHours: 0,
          taskCount: 0,
          pickedUpHours: 0,
          divertedAwayHours: 0,
        });
      }
      return byEmployeeMap.get(key);
    };

    // hours each person diverted away to a teammate — banked at the moment
    // they sent the handoff, regardless of whether the task is done yet
    for (const handoff of handoffs) {
      if (!handoff.fromUserId || !handoff.hoursSpent) continue;
      employeeEntry(handoff.fromUserId).divertedAwayHours += handoff.hoursSpent;
    }

    for (const task of tasks) {
      const approx = task.approximateHours || 0;

      // the estimate and the "1 task done" credit still go to whoever owns
      // the task now — only the actual hours get split below
      if (task.assigneeId) {
        const entry = employeeEntry(task.assigneeId);
        entry.approximateHours += approx;
        entry.taskCount += 1;
      }

      // actual hours are shared out by who really logged them, using
      // hoursLog — falls back to the assignee for tasks finished before
      // hoursLog existed
      const contributions = task.hoursLog?.length
        ? task.hoursLog.filter((entry) => entry.userId)
        : task.assigneeId
          ? [{ userId: task.assigneeId, hours: task.actualHours || 0 }]
          : [];
      for (const log of contributions) {
        const entry = employeeEntry(log.userId);
        entry.actualHours += log.hours || 0;

        // this specific hours-entry came from a task they picked up via a
        // handoff, not one they were originally assigned — credit it as
        // "someone else's work" on top of their normal actual hours
        if (pickedUpFrom.has(`${task._id}:${log.userId._id}`)) {
          entry.pickedUpHours += log.hours || 0;
        }
      }

      if (task.sprintId) {
        const key = String(task.sprintId._id);
        const entry = bySprintMap.get(key) || {
          sprintId: task.sprintId._id,
          sprintName: task.sprintId.name,
          approximateHours: 0,
          actualHours: 0,
          taskCount: 0,
        };
        entry.approximateHours += approx;
        entry.actualHours += task.actualHours || 0;
        entry.taskCount += 1;
        bySprintMap.set(key, entry);
      }
    }

    res.json({
      byEmployee: [...byEmployeeMap.values()],
      bySprint: [...bySprintMap.values()],
      tasks: tasks.map((task) => ({
        taskId: task._id,
        title: task.title,
        sprintId: task.sprintId?._id || null,
        sprintName: task.sprintId?.name || "",
        assigneeId: task.assigneeId?._id || null,
        assigneeName: task.assigneeId?.name || "",
        taskType: task.taskType,
        approximateHours: task.approximateHours || 0,
        actualHours: task.actualHours || 0,
        varianceHours: (task.actualHours || 0) - (task.approximateHours || 0),
        doneAt: task.doneAt,
      })),
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ message: "Failed to load analytics." });
  }
};
