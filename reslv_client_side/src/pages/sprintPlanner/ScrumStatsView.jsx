import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import api from "../../api/axios";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";
import { ChartCard, ChartTooltip, StatTile, CHART_COLORS, CHART_GRID } from "../../components/sprintPlanner/ChartPrimitives.jsx";
import HelpTip from "../../components/sprintPlanner/HelpTip.jsx";

const STATUS_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done" };

export default function ScrumStatsView() {
  const { activeProject } = useSprintPlanner();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);
    setError("");
    api
      .get(`/sprint-planner/projects/${activeProject._id}/stats`)
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load stats."))
      .finally(() => setLoading(false));
  }, [activeProject?._id]);

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[var(--text)] opacity-60">
        Select or create a project to see its Scrum stats.
      </div>
    );
  }

  if (loading) {
    return <p className="text-xs text-[var(--text)] opacity-60 p-6">Loading stats…</p>;
  }
  if (error) {
    return <p className="text-xs text-red-500 p-6">{error}</p>;
  }
  if (!stats) return null;

  const statusData = Object.entries(STATUS_LABELS).map(([id, label]) => ({
    status: label,
    count: stats.taskStatusCounts[id] || 0,
  }));

  return (
    <div className="p-6 flex flex-col gap-6">
      <HelpTip title="Scrum Stats">
        Velocity and completion rate only count closed sprints; cycle time is measured from a
        task's creation to when it's marked done.
      </HelpTip>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Avg. Sprint Completion"
          value={stats.avgSprintCompletionRate != null ? `${Math.round(stats.avgSprintCompletionRate)}%` : "—"}
          hint={stats.velocity.length ? `Across ${stats.velocity.length} closed sprint(s)` : "No closed sprints yet"}
        />
        <StatTile
          label="Avg. Cycle Time"
          value={stats.avgCycleTimeHours != null ? `${Math.round(stats.avgCycleTimeHours)}h` : "—"}
          hint="Task creation to done"
        />
        <StatTile label="Open Backlog Items" value={stats.backlog.openCount} />
        <StatTile label="Done Backlog Items" value={stats.backlog.doneCount} />
      </div>

      <ChartCard
        title="Velocity"
        subtitle="Story points completed per closed sprint (most recent 10)"
        height={260}
      >
        {stats.velocity.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[var(--text)] opacity-60">
            No closed sprints yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.velocity} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="sprintName" tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)" }} />
              <Bar dataKey="pointsCompleted" name="Points" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Task Status Distribution" subtitle="Across every task in this project" height={220}>
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
    </div>
  );
}
