import { useCallback, useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import api from "../../api/axios";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";
import { ChartCard, ChartTooltip, CHART_COLORS, CHART_IDEAL_COLOR, CHART_GRID } from "../../components/sprintPlanner/ChartPrimitives.jsx";
import HelpTip from "../../components/sprintPlanner/HelpTip.jsx";

const METRICS = [
  { id: "hours", label: "Effort Hours" },
  { id: "points", label: "Story Points" },
];

export default function BurndownChartView() {
  const { activeProject } = useSprintPlanner();
  const [scope, setScope] = useState("sprint"); // "sprint" | "backlog"
  const [metric, setMetric] = useState("hours");
  const [sprints, setSprints] = useState([]);
  const [backlogs, setBacklogs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeProject) return;
    Promise.all([
      api.get(`/sprint-planner/projects/${activeProject._id}/sprints`),
      api.get(`/sprint-planner/projects/${activeProject._id}/backlogs`),
    ]).then(([sprintsRes, backlogsRes]) => {
      setSprints(sprintsRes.data.sprints || []);
      setBacklogs(backlogsRes.data.backlogs || []);
    });
  }, [activeProject?._id]);

  useEffect(() => {
    const list = scope === "sprint" ? sprints : backlogs;
    if (list.length === 0) return;
    setActiveId((current) => (list.some((x) => x._id === current) ? current : list[0]._id));
  }, [scope, sprints, backlogs]);

  const load = useCallback(async () => {
    if (!activeProject || !activeId) return;
    setLoading(true);
    setError("");
    try {
      const path =
        scope === "sprint"
          ? `/sprint-planner/projects/${activeProject._id}/sprints/${activeId}/burndown`
          : `/sprint-planner/projects/${activeProject._id}/backlogs/${activeId}/burndown`;
      const res = await api.get(path);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load burndown.");
    } finally {
      setLoading(false);
    }
  }, [activeProject?._id, scope, activeId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[var(--text)] opacity-60">
        Select or create a project to see burndown charts.
      </div>
    );
  }

  const list = scope === "sprint" ? sprints : backlogs;
  const series = data?.[metric]?.series || [];
  const hasIdeal = series.some((p) => p.ideal !== null && p.ideal !== undefined);

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <HelpTip title="Burndown">
          Sprint burndown shows actual remaining work vs. an ideal straight-line pace (set the
          sprint's start/end dates to see the ideal line). Backlog burndown shows overall
          progress on a backlog with no fixed end date.
        </HelpTip>
        <div className="flex items-center gap-1 bg-[var(--color-muted)] rounded-[var(--radius-sm)] p-1">
          {[
            { id: "sprint", label: "Sprint" },
            { id: "backlog", label: "Backlog" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors ${scope === s.id ? "bg-[var(--color-card)] text-[var(--text-h)] shadow-sm" : "text-[var(--text)] opacity-70"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <select
          value={activeId || ""}
          onChange={(e) => setActiveId(e.target.value)}
          className="text-xs bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-1.5 focus:outline-hidden"
        >
          {list.length === 0 && <option value="">{`No ${scope}s yet`}</option>}
          {list.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 bg-[var(--color-muted)] rounded-[var(--radius-sm)] p-1">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors ${metric === m.id ? "bg-[var(--color-card)] text-[var(--text-h)] shadow-sm" : "text-[var(--text)] opacity-70"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <ChartCard
        title={`${METRICS.find((m) => m.id === metric)?.label} Remaining`}
        subtitle={scope === "sprint" ? "Actual vs. ideal burndown for the selected sprint" : "Actual remaining scope for the selected backlog"}
        height={320}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-[var(--text)] opacity-60">
            Loading…
          </div>
        ) : series.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[var(--text)] opacity-60">
            No data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              {(hasIdeal || series.length > 1) && <Legend wrapperStyle={{ fontSize: 11 }} />}
              <Line
                type="monotone"
                dataKey="remaining"
                name="Actual"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              {hasIdeal && (
                <Line
                  type="linear"
                  dataKey="ideal"
                  name="Ideal"
                  stroke={CHART_IDEAL_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {scope === "sprint" && !hasIdeal && series.length > 0 && (
        <p className="text-[11px] text-[var(--text)] opacity-60">
          Set this sprint's start and end dates to see an ideal-burndown reference line.
        </p>
      )}
    </div>
  );
}
