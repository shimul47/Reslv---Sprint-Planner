import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Trophy, Crown } from "lucide-react";
import api from "../api/axios";
import { ChartCard, ChartTooltip, StatTile, CHART_COLORS, CHART_GRID } from "../components/shared/ChartPrimitives.jsx";
import HelpTip from "../components/sprintPlanner/HelpTip.jsx";

const RANGE_PRESETS = [
  { id: "6m", label: "Last 6 months", months: 6 },
  { id: "12m", label: "Last 12 months", months: 12 },
  { id: "24m", label: "Last 24 months", months: 24 },
];

function presetRange(months) {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);
  return { start: start.toISOString(), end: end.toISOString() };
}

// "2026-01" -> "Jan '26"
function formatMonth(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-xs text-[var(--text)] opacity-60">
      No data in this range.
    </div>
  );
}

// A ranked list, not a fake "hardest working" composite score — concrete
// counts (and a secondary stat for context) let the reader judge for
// themselves. #1 gets a trophy; nothing else is editorialized.
function Leaderboard({ title, subtitle, rows, primaryLabel, renderPrimary, renderSecondary, emptyText }) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--text-h)]">{title}</h3>
        {subtitle && <p className="text-xs text-[var(--text)] opacity-70 mt-0.5">{subtitle}</p>}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-[var(--text)] opacity-60 p-5">{emptyText}</p>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--color-border)]">
          {rows.map((row, i) => (
            <div key={row.key} className="flex items-center gap-3 px-5 py-2.5">
              <span className="w-5 text-center text-xs font-semibold text-[var(--text)] opacity-50 flex-shrink-0">
                {i === 0 ? <Trophy size={14} className="text-amber-500 mx-auto" /> : i + 1}
              </span>
              <span className="flex-1 min-w-0 text-sm font-medium text-[var(--text-h)] truncate">{row.name}</span>
              <span className="text-sm font-semibold text-[var(--text-h)] flex-shrink-0">
                {renderPrimary(row)} <span className="text-[10px] font-normal opacity-60">{primaryLabel}</span>
              </span>
              {renderSecondary && (
                <span className="text-xs text-[var(--text)] opacity-60 flex-shrink-0 w-28 text-right">
                  {renderSecondary(row)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Module 3 — Engineering & Sprint Analytics Reports. Tickets/tasks
// completed over time, sprint hours per teammate, a resolution-time trend,
// and a sprint-by-sprint breakdown, all scoped to one date-range picker.
export default function StatisticsPage() {
  const [rangeId, setRangeId] = useState("12m");
  const [sprintId, setSprintId] = useState(""); // "" = date-range mode, otherwise a sprint's _id
  const [sprints, setSprints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isSprintMode = Boolean(sprintId);

  // Sprint list for the dropdown — fetched once, not scoped to the current
  // filter (an admin needs to see every sprint to pick one).
  useEffect(() => {
    api
      .get("/sprint-planner/sprints")
      .then((res) => setSprints(res.data.sprints || []))
      .catch(() => setSprints([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = isSprintMode
      ? { sprintId }
      : presetRange(RANGE_PRESETS.find((r) => r.id === rangeId).months);
    api
      .get("/reports/company-stats", { params })
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load statistics."))
      .finally(() => setLoading(false));
  }, [rangeId, sprintId, isSprintMode]);

  const ticketChartData = (stats?.ticketsCompletedByMonth || []).map((m) => ({
    month: formatMonth(m.month),
    Tickets: m.count,
  }));
  const taskChartData = (stats?.tasksCompletedByMonth || []).map((m) => ({
    month: formatMonth(m.month),
    Tasks: m.count,
  }));
  const resolutionTrendData = (stats?.ticketsCompletedByMonth || []).map((m) => ({
    month: formatMonth(m.month),
    "Avg hours to resolve": m.avgResolutionHours,
  }));
  const memberHoursData = (stats?.sprintHoursByMember || []).map((m) => ({
    name: m.name,
    Hours: m.hours,
  }));

  const totalTickets = (stats?.ticketsCompletedByMonth || []).reduce((s, m) => s + m.count, 0);
  const totalTasks = (stats?.tasksCompletedByMonth || []).reduce((s, m) => s + m.count, 0);
  const totalSprintHours =
    Math.round((stats?.sprintHoursByMember || []).reduce((s, m) => s + m.hours, 0) * 10) / 10;

  const resolverRows = (stats?.topResolvers || []).map((r) => ({ key: r.name, ...r }));
  const completerRows = (stats?.topTaskCompleters || []).map((r) => ({ key: r.userId, ...r }));
  const csatRows = (stats?.csat?.byAgent || []).map((r) => ({ key: r.userId, ...r }));

  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-h)]">Statistics</h2>
          <HelpTip title="Engineering & Sprint Analytics">
            Tickets and tasks completed over time, sprint hours logged per teammate, a
            resolution-time trend, and a sprint-by-sprint breakdown. Filter by date range, or pick
            one sprint to see just that sprint's task/hours stats and top performer — tickets aren't
            tied to sprints, so ticket metrics only apply in date-range mode.
          </HelpTip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            className="text-xs bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-1.5 focus:outline-hidden w-full sm:w-auto"
          >
            <option value="">All sprints (date range)</option>
            {sprints.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={rangeId}
            onChange={(e) => setRangeId(e.target.value)}
            disabled={isSprintMode}
            title={isSprintMode ? "Clear the sprint filter to use a date range" : undefined}
            className="text-xs bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-1.5 focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {RANGE_PRESETS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {loading ? (
        <p className="text-xs text-[var(--text)] opacity-60">Loading statistics…</p>
      ) : (
        <>
          {isSprintMode && stats?.selectedSprint && (
            <div className="flex items-center gap-3 bg-[var(--accent-bg)] border border-[var(--accent-border)] rounded-[var(--radius-lg)] px-5 py-3">
              <Crown size={18} className="text-amber-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-h)]">
                  Viewing <span className="opacity-80">{stats.selectedSprint.name}</span>
                  {completerRows[0] && (
                    <>
                      {" "}— top performer:{" "}
                      <span className="opacity-80">
                        {completerRows[0].name} ({completerRows[0].tasksCompleted} tasks, {completerRows[0].hoursLogged}h)
                      </span>
                    </>
                  )}
                </p>
                <p className="text-xs text-[var(--text)] opacity-70 mt-0.5">
                  Ticket-based metrics (resolved tickets, resolution time, satisfaction) aren't shown
                  here — tickets aren't tied to sprints. Clear the sprint filter to see those.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {!isSprintMode && <StatTile label="Tickets Resolved" value={totalTickets} />}
            <StatTile label="Tasks Completed" value={totalTasks} />
            <StatTile label="Sprint Hours Logged" value={totalSprintHours} />
            {!isSprintMode && (
              <StatTile
                label="Customer Satisfaction"
                value={stats?.csat?.average != null ? `${stats.csat.average} / 5` : "—"}
                hint={stats?.csat?.count ? `From ${stats.csat.count} review${stats.csat.count === 1 ? "" : "s"}` : "No reviews yet"}
              />
            )}
          </div>

          {!isSprintMode && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Tickets Resolved by Month" subtitle="Count of tickets marked resolved">
                {ticketChartData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketChartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_GRID} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)" }} />
                      <Bar dataKey="Tickets" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Tasks Completed by Month" subtitle="Count of sprint tasks marked done">
                {taskChartData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskChartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_GRID} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)" }} />
                      <Bar dataKey="Tasks" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}

          {!isSprintMode && (
            <ChartCard
              title="Average Resolution Time Trend"
              subtitle="Hours from ticket creation to resolution, per month"
            >
              {resolutionTrendData.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={resolutionTrendData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="Avg hours to resolve"
                      stroke={CHART_COLORS[1]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}

          <ChartCard
            title="Sprint Hours by Teammate"
            subtitle={`Actual hours logged, from tasks completed ${isSprintMode ? "in this sprint" : "in this range"}`}
            height={Math.max(200, memberHoursData.length * 42)}
          >
            {memberHoursData.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberHoursData} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--text-h)" }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)" }} />
                  <Bar dataKey="Hours" fill={CHART_COLORS[3]} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className={`grid grid-cols-1 gap-4 ${isSprintMode ? "" : "lg:grid-cols-3"}`}>
            {!isSprintMode && (
              <Leaderboard
                title="Top Ticket Resolvers"
                subtitle="By tickets resolved in this range"
                rows={resolverRows}
                primaryLabel="resolved"
                renderPrimary={(r) => r.ticketsResolved}
                renderSecondary={(r) => `${r.avgResolutionHours}h avg`}
                emptyText="No resolved tickets in this range."
              />
            )}
            <Leaderboard
              title="Top Task Completers"
              subtitle={isSprintMode ? "By tasks marked done in this sprint" : "By sprint tasks marked done"}
              rows={completerRows}
              primaryLabel="tasks"
              renderPrimary={(r) => r.tasksCompleted}
              renderSecondary={(r) => `${r.hoursLogged}h logged`}
              emptyText={isSprintMode ? "No completed tasks in this sprint." : "No completed tasks in this range."}
            />
            {!isSprintMode && (
              <Leaderboard
                title="Customer Satisfaction"
                subtitle="By average rating this range"
                rows={csatRows}
                primaryLabel="/ 5"
                renderPrimary={(r) => r.avgRating}
                renderSecondary={(r) => `${r.count} review${r.count === 1 ? "" : "s"}`}
                emptyText="No feedback submitted in this range."
              />
            )}
          </div>

          <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <h3 className="text-sm font-semibold text-[var(--text-h)]">
                {isSprintMode ? "Sprint Detail" : "Sprint-by-Sprint Breakdown"}
              </h3>
              <p className="text-xs text-[var(--text)] opacity-70 mt-0.5">
                {isSprintMode
                  ? "Task count, hours, and average cycle time for the selected sprint."
                  : "Only sprints with completed work in this range."}
              </p>
            </div>
            {(stats?.bySprint || []).length === 0 ? (
              <p className="text-xs text-[var(--text)] opacity-60 p-5">No completed sprint work in this range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-[var(--text)] opacity-60 border-b border-[var(--color-border)]">
                      <th className="text-left px-5 py-2.5 font-semibold">Sprint</th>
                      <th className="text-right px-5 py-2.5 font-semibold">Tasks Done</th>
                      <th className="text-right px-5 py-2.5 font-semibold">Approx. Hours</th>
                      <th className="text-right px-5 py-2.5 font-semibold">Actual Hours</th>
                      <th className="text-right px-5 py-2.5 font-semibold">Avg Cycle Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.bySprint.map((s) => (
                      <tr key={s.sprintId} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-5 py-2.5 font-medium text-[var(--text-h)]">{s.name}</td>
                        <td className="px-5 py-2.5 text-right">{s.taskCount}</td>
                        <td className="px-5 py-2.5 text-right">{s.totalApproxHours}h</td>
                        <td className="px-5 py-2.5 text-right">{s.totalActualHours}h</td>
                        <td className="px-5 py-2.5 text-right">{s.avgCycleTimeHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
