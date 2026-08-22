import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import api from "../../api/axios";
import { ChartCard, ChartTooltip, StatTile, CHART_COLORS, CHART_GRID } from "../../components/sprintPlanner/ChartPrimitives.jsx";
import HelpTip from "../../components/sprintPlanner/HelpTip.jsx";

// Company-wide approximate-vs-actual hours, filterable by employee — the
// dedicated performance view for admin/sprint_planner (requirement #7).
export default function PerformanceAnalyticsView() {
  const [analytics, setAnalytics] = useState(null);
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get("/sprint-planner/analytics", { params: employeeId ? { employeeId } : {} })
      .then((res) => setAnalytics(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load analytics."))
      .finally(() => setLoading(false));
  }, [employeeId]);

  const employeeOptions = analytics?.byEmployee || [];
  const chartData = (analytics?.byEmployee || []).map((e) => ({
    name: e.name,
    Approximate: e.approximateHours,
    Actual: e.actualHours,
  }));

  const totals = (analytics?.byEmployee || []).reduce(
    (acc, e) => ({
      approximateHours: acc.approximateHours + e.approximateHours,
      actualHours: acc.actualHours + e.actualHours,
      taskCount: acc.taskCount + e.taskCount,
    }),
    { approximateHours: 0, actualHours: 0, taskCount: 0 },
  );

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <HelpTip title="Performance">
          Compares each completed task's approximate estimate against the actual hours the
          assignee reported when marking it done. Only completed tasks are counted.
        </HelpTip>

        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="text-xs bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-1.5 focus:outline-hidden"
        >
          <option value="">All employees</option>
          {employeeOptions.map((e) => (
            <option key={e.userId} value={e.userId}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {loading ? (
        <p className="text-xs text-[var(--text)] opacity-60">Loading performance data…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatTile label="Completed Tasks" value={totals.taskCount} />
            <StatTile label="Approximate Hours" value={totals.approximateHours} />
            <StatTile label="Actual Hours" value={totals.actualHours} />
          </div>

          <ChartCard
            title="Approximate vs. Actual Hours"
            subtitle="Per employee, across completed tasks"
            height={Math.max(220, chartData.length * 50)}
          >
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--text)] opacity-60">
                No completed tasks yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--text-h)" }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-muted)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Approximate" fill={CHART_COLORS[0]} radius={[0, 6, 6, 0]} />
                  <Bar dataKey="Actual" fill={CHART_COLORS[1]} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}
