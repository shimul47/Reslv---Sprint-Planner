import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import api from "../../api/axios";
import { ChartCard, StatTile } from "../shared/ChartPrimitives.jsx";

const SEVERITY_STYLES = {
  low: "bg-[var(--color-border)] text-[var(--text)]",
  medium: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  high: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  critical: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function SeverityBadge({ severity }) {
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
        SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium
      }`}
    >
      {severity}
    </span>
  );
}

// Activity, escalations, and team performance in one glance — the
// Monitoring tab of the Admin panel. Pulls from three endpoints that
// already exist for other pages (ticket reports, escalation queue,
// company stats) rather than duplicating their aggregation logic.
export default function MonitoringDashboard() {
  const [summary, setSummary] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/tickets/reports/summary"),
      api.get("/tickets/reports/escalations"),
      api.get("/reports/company-stats"),
    ])
      .then(([summaryRes, escalationsRes, statsRes]) => {
        setSummary(summaryRes.data);
        setEscalations(escalationsRes.data.escalations || []);
        setStats(statsRes.data);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load monitoring data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 text-xs text-[var(--text)] opacity-60">Loading monitoring data...</div>;
  }

  if (error) {
    return <div className="p-6 text-xs text-red-500">{error}</div>;
  }

  const totals = summary?.totals || {};
  const topResolvers = (stats?.topResolvers || []).slice(0, 5);
  const topTaskCompleters = (stats?.topTaskCompleters || []).slice(0, 5);
  const sprintHours = (stats?.sprintHoursByMember || []).slice(0, 5);

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Open" value={totals.open ?? 0} />
        <StatTile label="In Progress" value={totals.inProgress ?? 0} />
        <StatTile label="Escalated" value={totals.escalated ?? 0} />
        <StatTile label="Resolved" value={totals.resolved ?? 0} />
        <StatTile label="SLA Breaches" value={summary?.slaBreaches ?? 0} />
        <StatTile label="Avg CSAT" value={stats?.csat?.average ?? "—"} hint={stats?.csat ? `${stats.csat.count} ratings` : ""} />
      </div>

      <ChartCard
        title="Escalation queue"
        subtitle="Open escalations, oldest first — matches the escalation age used to prompt a sprint task."
        height="auto"
      >
        {escalations.length === 0 ? (
          <p className="text-xs text-[var(--text)] opacity-60 py-4">No open escalations.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border)] -mx-4 sm:-mx-5">
            {escalations.map((e) => (
              <div key={e.ticketNumber} className="px-4 sm:px-5 py-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-[var(--text-h)]">{e.ticketNumber}</span>
                  <SeverityBadge severity={e.severity} />
                  <span className="text-xs text-[var(--text)] opacity-70 truncate flex-1">{e.subject}</span>
                  <span className="text-[10px] text-[var(--text)] opacity-60 flex-shrink-0">{e.ageHours}h open</span>
                </div>
                <p className="text-xs text-[var(--text)] opacity-70 pl-6">
                  {e.escalation.summary || "No AI summary generated."}
                  {e.escalation.suggestedTeamName ? ` — suggested team: ${e.escalation.suggestedTeamName}` : ""}
                </p>
                {e.linkedTask && (
                  <p className="text-[10px] text-[var(--text)] opacity-60 pl-6">
                    Linked task "{e.linkedTask.title}" — {e.linkedTask.status}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Top ticket resolvers" height="auto">
          {topResolvers.length === 0 ? (
            <p className="text-xs text-[var(--text)] opacity-60 py-2">No resolved tickets yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {topResolvers.map((r) => (
                <li key={r.name} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-h)] font-medium truncate">{r.name}</span>
                  <span className="text-[var(--text)] opacity-70 flex-shrink-0">{r.ticketsResolved} resolved</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
        <ChartCard title="Top task completers" height="auto">
          {topTaskCompleters.length === 0 ? (
            <p className="text-xs text-[var(--text)] opacity-60 py-2">No completed tasks yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {topTaskCompleters.map((r) => (
                <li key={r.userId} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-h)] font-medium truncate">{r.name}</span>
                  <span className="text-[var(--text)] opacity-70 flex-shrink-0">{r.tasksCompleted} done</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
        <ChartCard title="Sprint hours logged" height="auto">
          {sprintHours.length === 0 ? (
            <p className="text-xs text-[var(--text)] opacity-60 py-2">No sprint hours logged yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sprintHours.map((r) => (
                <li key={r.userId} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-h)] font-medium truncate">{r.name}</span>
                  <span className="text-[var(--text)] opacity-70 flex-shrink-0">{r.hours}h</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
