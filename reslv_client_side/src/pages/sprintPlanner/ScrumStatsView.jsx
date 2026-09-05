import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import api from "../../api/axios";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";
import { ChartCard, ChartTooltip, StatTile, CHART_COLORS, CHART_GRID } from "../../components/sprintPlanner/ChartPrimitives.jsx";
import HelpTip from "../../components/sprintPlanner/HelpTip.jsx";

const STATUS_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done" };

export default function ScrumStatsView() {
  const { sprints, activeSprintId, setActiveSprintId } = useSprintPlanner();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeSprintId) return;
    setLoading(true);
    setError("");
    api
      .get(`/sprint-planner/sprints/${activeSprintId}/stats`)
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load stats."))
      .finally(() => setLoading(false));
  }, [activeSprintId]);

  const statusData = stats
    ? Object.entries(STATUS_LABELS).map(([id, label]) => ({
        status: label,
        count: stats.taskStatusCounts[id] || 0,
      }))
    : [];

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <HelpTip title="Sprint Stats">
          Cycle time is measured from a task's creation to when it's marked done. Total hours
          compare approximate estimates against actual hours logged so far.
        </HelpTip>

        <select
          value={activeSprintId || ""}
          onChange={(e) => setActiveSprintId(e.target.value)}
          className="text-xs bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-1.5 focus:outline-hidden"
        >
          {sprints.length === 0 && <option value="">No sprints yet</option>}
          {sprints.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text)] opacity-60">Loading stats…</p>
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Tasks" value={stats.taskCount} />
            <StatTile
              label="Avg. Cycle Time"
              value={stats.avgCycleTimeHours != null ? `${Math.round(stats.avgCycleTimeHours)}h` : "—"}
              hint="Task creation to done"
            />
            <StatTile label="Approximate Hours" value={stats.totalApproximateHours} />
            <StatTile label="Actual Hours So Far" value={stats.totalActualHoursSoFar} />
          </div>

          <ChartCard title="Task Status Distribution" subtitle="Across every task in this sprint" height={220}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11, fill: "var(--text-h)" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)" }} />
                <Bar dataKey="count" name="Tasks" fill={CHART_COLORS[0]} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      ) : null}
    </div>
  );
}
