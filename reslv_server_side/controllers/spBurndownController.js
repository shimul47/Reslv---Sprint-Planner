import Sprint from "../models/Sprint.js";
import ProductBacklog from "../models/ProductBacklog.js";
import Pbi from "../models/Pbi.js";
import Task from "../models/Task.js";
import TimeLog from "../models/TimeLog.js";
import { isEmployeeOnly } from "../middleware/projectAccess.js";

const MAX_DAYS = 120;

// UTC-anchored on purpose: timestamps are stored in UTC, and bucketing by
// local server time would shift date labels by a day depending on where the
// server happens to be deployed relative to the data it's reading.
function dateOnly(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
const isoDate = (d) => dateOnly(d).toISOString().slice(0, 10);

function daysBetween(start, end) {
  const days = [];
  let cur = dateOnly(start);
  const last = dateOnly(end);
  while (cur <= last && days.length < MAX_DAYS) {
    days.push(new Date(cur));
    cur = new Date(cur.getTime() + 86_400_000);
  }
  return days.length ? days : [dateOnly(start)];
}

// Remaining-points-style series: sums valueField across items that aren't
// "done as of that day" (doneAt null, or doneAt after that day's end).
function remainingSeries(items, valueField, days) {
  return days.map((day) => {
    const endOfDay = new Date(day.getTime() + 86_400_000 - 1);
    const remaining = items.reduce((sum, item) => {
      const done = item.doneAt && new Date(item.doneAt) <= endOfDay;
      return done ? sum : sum + (item[valueField] || 0);
    }, 0);
    return { date: isoDate(day), remaining };
  });
}

// Hours series reconstructed by replaying each task's TimeLog history: on a
// given day, a task's remaining hours = the most recent log's
// remainingHoursAfter at or before that day, or its estimateHours if no log
// has landed yet, or 0 once the task is done.
function hoursSeries(tasks, logsByTask, days) {
  return days.map((day) => {
    const endOfDay = new Date(day.getTime() + 86_400_000 - 1);
    const remaining = tasks.reduce((sum, task) => {
      if (task.doneAt && new Date(task.doneAt) <= endOfDay) return sum;
      const logs = logsByTask.get(String(task._id)) || [];
      const lastLogBeforeDay = [...logs].reverse().find((l) => new Date(l.spentOn) <= endOfDay);
      const remainingForTask = lastLogBeforeDay
        ? lastLogBeforeDay.remainingHoursAfter
        : task.estimateHours;
      return sum + (remainingForTask || 0);
    }, 0);
    return { date: isoDate(day), remaining };
  });
}

function withIdeal(series, total, hasIdeal) {
  if (!hasIdeal || series.length < 2) {
    return series.map((point) => ({ ...point, ideal: null }));
  }
  const lastIndex = series.length - 1;
  return series.map((point, index) => ({
    ...point,
    ideal: Math.max(0, total - (total * index) / lastIndex),
  }));
}

export const getSprintBurndown = async (req, res) => {
  try {
    const sprint = await Sprint.findOne({ _id: req.params.sprintId, projectId: req.project._id }).lean();
    if (!sprint) {
      return res.status(404).json({ message: "Sprint not found." });
    }
    if (isEmployeeOnly(req.user) && !sprint.published) {
      return res.status(404).json({ message: "Sprint not found." });
    }

    const [tasks, pbis] = await Promise.all([
      Task.find({ sprintId: sprint._id }).lean(),
      Pbi.find({ sprintId: sprint._id }).lean(),
    ]);

    const rangeStart = sprint.startDate ? new Date(sprint.startDate) : new Date(sprint.createdAt);
    const rangeEndFull = sprint.endDate ? new Date(sprint.endDate) : new Date();
    const rangeEnd = rangeEndFull < new Date() ? rangeEndFull : new Date();
    const days = daysBetween(rangeStart, rangeEnd < rangeStart ? rangeStart : rangeEnd);
    const hasIdeal = Boolean(sprint.startDate && sprint.endDate);

    const logs = await TimeLog.find({ taskId: { $in: tasks.map((t) => t._id) } })
      .sort({ spentOn: 1 })
      .lean();
    const logsByTask = new Map();
    for (const log of logs) {
      const key = String(log.taskId);
      if (!logsByTask.has(key)) logsByTask.set(key, []);
      logsByTask.get(key).push(log);
    }

    const totalHours = tasks.reduce((sum, t) => sum + (t.estimateHours || 0), 0);
    const totalPoints = pbis.reduce((sum, p) => sum + (p.storyPoints || 0), 0);

    res.json({
      sprint: { _id: sprint._id, name: sprint.name, startDate: sprint.startDate, endDate: sprint.endDate },
      hours: { total: totalHours, series: withIdeal(hoursSeries(tasks, logsByTask, days), totalHours, hasIdeal) },
      points: { total: totalPoints, series: withIdeal(remainingSeries(pbis, "storyPoints", days), totalPoints, hasIdeal) },
    });
  } catch (error) {
    console.error("Sprint burndown error:", error);
    res.status(500).json({ message: "Failed to compute sprint burndown." });
  }
};

// Backlog burndown works at the item-estimate level (points & effort hours
// on the PBI itself), not task-level time logs — most backlog items don't
// have tasks yet until they're pulled into a sprint. Actual-only: a backlog
// has no fixed end date to draw an ideal line against.
export const getBacklogBurndown = async (req, res) => {
  try {
    const backlog = await ProductBacklog.findOne({
      _id: req.params.backlogId,
      projectId: req.project._id,
    }).lean();
    if (!backlog) {
      return res.status(404).json({ message: "Backlog not found." });
    }

    const pbis = await Pbi.find({ backlogId: backlog._id }).lean();
    const days = daysBetween(backlog.createdAt, new Date());

    const totalHours = pbis.reduce((sum, p) => sum + (p.effortHours || 0), 0);
    const totalPoints = pbis.reduce((sum, p) => sum + (p.storyPoints || 0), 0);

    res.json({
      backlog: { _id: backlog._id, name: backlog.name },
      hours: { total: totalHours, series: remainingSeries(pbis, "effortHours", days) },
      points: { total: totalPoints, series: remainingSeries(pbis, "storyPoints", days) },
    });
  } catch (error) {
    console.error("Backlog burndown error:", error);
    res.status(500).json({ message: "Failed to compute backlog burndown." });
  }
};
