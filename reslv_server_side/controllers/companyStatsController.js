import Ticket from "../models/Ticket.js";
import Task from "../models/Task.js";
import Sprint from "../models/Sprint.js";
import Feedback from "../models/Feedback.js";
import { resolveCompanyId } from "../utils/companyScope.js";
import { companyHasFeature } from "../utils/planAccess.js";

// "2026-01" style key — sortable as a plain string, and compact enough to
// use directly as a chart x-axis label.
function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Engineering & Sprint Analytics — one endpoint, admin/superadmin only,
// gated behind the same "reports" plan feature as the ticket reports page.
// Everything here is scoped to an explicit [start, end] window (default:
// trailing 12 months) rather than the ticket report's fixed day presets, so
// it actually answers "by month or year" instead of "last N days".
export const getCompanyStats = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }

    const isSuperAdmin = req.user.roles?.includes("superadmin");
    if (!isSuperAdmin && !(await companyHasFeature(companyId, "reports"))) {
      return res.status(403).json({
        message: "Statistics require the Professional plan or higher.",
        upgradeRequired: "professional",
      });
    }

    const end = req.query.end ? new Date(req.query.end) : new Date();
    const start = req.query.start
      ? new Date(req.query.start)
      : new Date(new Date(end).setFullYear(end.getFullYear() - 1));

    // Two mutually-exclusive filter modes: a date range (the default), or
    // one specific sprint. Tickets have no relationship to sprints at all,
    // so sprint mode skips the ticket/feedback queries entirely rather than
    // silently mixing an unrelated date-ranged number in.
    const sprintId = req.query.sprintId || null;
    const taskFilter = sprintId
      ? { companyId, status: "done", sprintId }
      : { companyId, status: "done", doneAt: { $gte: start, $lte: end } };

    const [resolvedTickets, doneTasks, sprints, ticketFeedback, selectedSprint] = await Promise.all([
      sprintId
        ? []
        : Ticket.find({ companyId, status: "resolved", resolvedAt: { $gte: start, $lte: end } })
            .select("resolvedAt createdAt assignee")
            .lean(),
      Task.find(taskFilter)
        .select("sprintId doneAt createdAt approximateHours actualHours hoursLog assigneeId")
        .populate("hoursLog.userId", "name")
        .populate("assigneeId", "name")
        .lean(),
      Sprint.find({ companyId }).select("name").lean(),
      sprintId
        ? []
        : Feedback.find({ companyId, type: "ticket", createdAt: { $gte: start, $lte: end } })
            .select("agentId rating")
            .populate("agentId", "name")
            .lean(),
      sprintId ? Sprint.findOne({ _id: sprintId, companyId }).select("name").lean() : null,
    ]);

    // Tickets completed by month, plus that month's average resolution time
    // — one pass, since both come from the same resolved-ticket set.
    const ticketMonthMap = new Map();
    for (const t of resolvedTickets) {
      const key = monthKey(t.resolvedAt);
      const entry = ticketMonthMap.get(key) || { month: key, count: 0, totalResolutionHours: 0 };
      entry.count += 1;
      entry.totalResolutionHours += (new Date(t.resolvedAt) - new Date(t.createdAt)) / 3_600_000;
      ticketMonthMap.set(key, entry);
    }
    const ticketsCompletedByMonth = [...ticketMonthMap.values()]
      .map((e) => ({
        month: e.month,
        count: e.count,
        avgResolutionHours: Math.round((e.totalResolutionHours / e.count) * 10) / 10,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Tasks completed by month.
    const taskMonthMap = new Map();
    for (const t of doneTasks) {
      const key = monthKey(t.doneAt);
      taskMonthMap.set(key, (taskMonthMap.get(key) || 0) + 1);
    }
    const tasksCompletedByMonth = [...taskMonthMap.entries()]
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Sprint hours per member — summed from each done task's hoursLog, so a
    // handed-off task still credits the right people (see hoursLog on Task).
    // Bounded by the task's doneAt falling in range, since individual
    // hoursLog entries don't carry their own timestamp.
    const memberMap = new Map();
    for (const t of doneTasks) {
      for (const log of t.hoursLog || []) {
        if (!log.userId) continue;
        const key = String(log.userId._id || log.userId);
        const entry = memberMap.get(key) || {
          userId: log.userId._id || log.userId,
          name: log.userId.name || "Unknown",
          hours: 0,
        };
        entry.hours += log.hours || 0;
        memberMap.set(key, entry);
      }
    }
    const sprintHoursByMember = [...memberMap.values()]
      .map((e) => ({ ...e, hours: Math.round(e.hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours);

    // Sprint-wise rollup — only sprints with completed work in this window.
    const bySprintMap = new Map();
    for (const t of doneTasks) {
      const key = String(t.sprintId);
      const entry = bySprintMap.get(key) || {
        taskCount: 0,
        totalApproxHours: 0,
        totalActualHours: 0,
        cycleTimeHours: [],
      };
      entry.taskCount += 1;
      entry.totalApproxHours += t.approximateHours || 0;
      entry.totalActualHours += t.actualHours || 0;
      entry.cycleTimeHours.push((new Date(t.doneAt) - new Date(t.createdAt)) / 3_600_000);
      bySprintMap.set(key, entry);
    }
    const sprintNameById = new Map(sprints.map((s) => [String(s._id), s.name]));
    const bySprint = [...bySprintMap.entries()]
      .map(([sprintId, agg]) => ({
        sprintId,
        name: sprintNameById.get(sprintId) || "Deleted sprint",
        taskCount: agg.taskCount,
        totalApproxHours: Math.round(agg.totalApproxHours * 10) / 10,
        totalActualHours: Math.round(agg.totalActualHours * 10) / 10,
        avgCycleTimeHours:
          Math.round((agg.cycleTimeHours.reduce((a, b) => a + b, 0) / agg.cycleTimeHours.length) * 10) / 10,
      }))
      .sort((a, b) => b.taskCount - a.taskCount);

    // Top ticket resolvers — concrete volume + speed, not a fuzzy "hardest
    // working" score. Grouped by the ticket's assignee label, matching the
    // same convention the ticket Reports page already uses.
    const resolverMap = new Map();
    for (const t of resolvedTickets) {
      const name = t.assignee && t.assignee !== "Unassigned" ? t.assignee : null;
      if (!name) continue;
      const entry = resolverMap.get(name) || { name, ticketsResolved: 0, totalResolutionHours: 0 };
      entry.ticketsResolved += 1;
      entry.totalResolutionHours += (new Date(t.resolvedAt) - new Date(t.createdAt)) / 3_600_000;
      resolverMap.set(name, entry);
    }
    const topResolvers = [...resolverMap.values()]
      .map((e) => ({
        name: e.name,
        ticketsResolved: e.ticketsResolved,
        avgResolutionHours: Math.round((e.totalResolutionHours / e.ticketsResolved) * 10) / 10,
      }))
      .sort((a, b) => b.ticketsResolved - a.ticketsResolved)
      .slice(0, 10);

    // Top task completers — who's actually finishing the work, by count
    // (separate from sprintHoursByMember's hours view above).
    const completerMap = new Map();
    for (const t of doneTasks) {
      if (!t.assigneeId) continue;
      const key = String(t.assigneeId._id || t.assigneeId);
      const entry = completerMap.get(key) || {
        userId: t.assigneeId._id || t.assigneeId,
        name: t.assigneeId.name || "Unknown",
        tasksCompleted: 0,
      };
      entry.tasksCompleted += 1;
      completerMap.set(key, entry);
    }
    const hoursByUserId = new Map(sprintHoursByMember.map((m) => [String(m.userId), m.hours]));
    const topTaskCompleters = [...completerMap.values()]
      .map((e) => ({ ...e, hoursLogged: hoursByUserId.get(String(e.userId)) || 0 }))
      .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
      .slice(0, 10);

    // Customer satisfaction — real feedback ratings (1-5), not inferred.
    // Small-sample agents aren't hidden, just shown with their count so a
    // 5.0 from one review reads differently than a 4.8 from thirty.
    const csatByAgentMap = new Map();
    let csatTotal = 0;
    for (const f of ticketFeedback) {
      csatTotal += f.rating;
      if (!f.agentId) continue;
      const key = String(f.agentId._id || f.agentId);
      const entry = csatByAgentMap.get(key) || {
        userId: f.agentId._id || f.agentId,
        name: f.agentId.name || "Unknown",
        totalRating: 0,
        count: 0,
      };
      entry.totalRating += f.rating;
      entry.count += 1;
      csatByAgentMap.set(key, entry);
    }
    const csat = {
      average: ticketFeedback.length ? Math.round((csatTotal / ticketFeedback.length) * 10) / 10 : null,
      count: ticketFeedback.length,
      byAgent: [...csatByAgentMap.values()]
        .map((e) => ({
          userId: e.userId,
          name: e.name,
          avgRating: Math.round((e.totalRating / e.count) * 10) / 10,
          count: e.count,
        }))
        .sort((a, b) => b.avgRating - a.avgRating),
    };

    res.json({
      mode: sprintId ? "sprint" : "range",
      start,
      end,
      selectedSprint: selectedSprint ? { sprintId: selectedSprint._id, name: selectedSprint.name } : null,
      ticketsCompletedByMonth,
      tasksCompletedByMonth,
      sprintHoursByMember,
      bySprint,
      topResolvers,
      topTaskCompleters,
      csat,
    });
  } catch (error) {
    console.error("Get company stats error:", error);
    res.status(500).json({ message: "Failed to load statistics." });
  }
};
