import Task from "../models/Task.js";
import Sprint from "../models/Sprint.js";
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

    const tasks = await Task.find(filter)
      .populate("assigneeId", "name email")
      .populate("sprintId", "name")
      .sort({ doneAt: -1 })
      .lean();

    const byEmployeeMap = new Map();
    const bySprintMap = new Map();

    for (const task of tasks) {
      const approx = task.approximateHours || 0;
      const actual = task.actualHours || 0;

      if (task.assigneeId) {
        const key = String(task.assigneeId._id);
        const entry = byEmployeeMap.get(key) || {
          userId: task.assigneeId._id,
          name: task.assigneeId.name,
          approximateHours: 0,
          actualHours: 0,
          taskCount: 0,
        };
        entry.approximateHours += approx;
        entry.actualHours += actual;
        entry.taskCount += 1;
        byEmployeeMap.set(key, entry);
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
        entry.actualHours += actual;
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
