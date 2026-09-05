import { useEffect, useState } from "react";
import { RefreshCw, BellRing, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import api from "../../api/axios";

const RANGE_OPTIONS = [
  { id: 7, label: "Next 7 days" },
  { id: 14, label: "Next 14 days" },
  { id: 30, label: "Next 30 days" },
];

// Pulls every employee's connected Google Calendar busy time in one go —
// so an admin can see who's actually free before assigning sprint work,
// instead of guessing from a flat hours-per-sprint number. Anyone not
// connected yet can be nudged with a reminder email straight from here.
export default function TeamAvailabilityPanel() {
  const [days, setDays] = useState(7);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nudging, setNudging] = useState(null);
  const [nudged, setNudged] = useState(new Set());

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const start = new Date();
      const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const res = await api.get("/calendar/team-availability", {
        params: { start: start.toISOString(), end: end.toISOString() },
      });
      setEmployees(res.data.employees || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load team availability.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const handleNudge = async (userId) => {
    setNudging(userId);
    setError("");
    try {
      await api.post(`/calendar/nudge/${userId}`);
      setNudged((prev) => new Set(prev).add(userId));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reminder.");
    } finally {
      setNudging(null);
    }
  };

  const formatDateHeading = (date) =>
    date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  const formatTimeRange = (block) => {
    const timeFmt = { hour: "numeric", minute: "2-digit" };
    const blockStart = new Date(block.start);
    const blockEnd = new Date(block.end);
    return blockStart.toDateString() === blockEnd.toDateString()
      ? `${blockStart.toLocaleTimeString(undefined, timeFmt)} – ${blockEnd.toLocaleTimeString(undefined, timeFmt)}`
      : `${blockStart.toLocaleTimeString(undefined, timeFmt)} – ${blockEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${blockEnd.toLocaleTimeString(undefined, timeFmt)}`;
  };

  // Groups a flat busy-block list into one entry per calendar day, so the
  // list reads as a little day-by-day timeline instead of a wall of "Busy …"
  // lines that all repeat the same word.
  const groupByDate = (busy) => {
    const groups = new Map();
    for (const block of busy) {
      const start = new Date(block.start);
      const key = start.toDateString();
      if (!groups.has(key)) groups.set(key, { date: start, blocks: [] });
      groups.get(key).blocks.push(block);
    }
    return [...groups.values()];
  };

  const connectedCount = employees.filter((e) => e.connected).length;

  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden">
      <div className="px-3 sm:px-6 py-4 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-h)]">Team Calendar</h3>
          <p className="text-xs opacity-70 mt-0.5">
            {connectedCount} of {employees.length} teammate{employees.length === 1 ? "" : "s"} have Google
            Calendar connected.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1.5 focus:outline-hidden"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs font-medium border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 hover:bg-[var(--color-muted)] cursor-pointer"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col divide-y divide-[var(--color-border)]">
        {error && <p className="text-xs text-red-500 pb-3">{error}</p>}
        {loading ? (
          <p className="text-xs opacity-60 py-3">Loading…</p>
        ) : employees.length === 0 ? (
          <p className="text-xs opacity-60 py-3">No teammates yet.</p>
        ) : (
          employees.map((emp) => {
            const dayGroups = emp.connected ? groupByDate(emp.busy || []) : [];
            return (
              <div key={emp.userId} className="py-4 flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className="h-9 w-9 rounded-full bg-[var(--color-border)] flex items-center justify-center text-xs font-bold text-[var(--color-foreground)]/70">
                    {emp.name ? emp.name.charAt(0).toUpperCase() : "?"}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-card)] ${emp.connected ? "bg-green-500" : "bg-[var(--color-muted)]"}`}
                    title={emp.connected ? "Connected" : "Not connected"}
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-h)] truncate">{emp.name}</p>
                      {emp.googleEmail && <p className="text-[11px] opacity-50 truncate">{emp.googleEmail}</p>}
                    </div>
                    {!emp.connected && (
                      <button
                        onClick={() => handleNudge(emp.userId)}
                        disabled={nudging === emp.userId || nudged.has(emp.userId)}
                        className="flex items-center gap-1 text-[11px] font-medium border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 hover:bg-[var(--color-muted)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        <BellRing size={11} />
                        {nudged.has(emp.userId) ? "Reminder sent" : nudging === emp.userId ? "Sending…" : "Nudge"}
                      </button>
                    )}
                  </div>

                  {!emp.connected ? (
                    <p className="text-[11px] opacity-60">
                      {emp.error || "Hasn't connected Google Calendar yet."}
                    </p>
                  ) : emp.error ? (
                    <span className="inline-flex items-center gap-1 w-fit text-[11px] font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
                      <AlertTriangle size={11} /> {emp.error}
                    </span>
                  ) : dayGroups.length === 0 ? (
                    <span className="inline-flex items-center gap-1 w-fit text-[11px] font-medium text-green-600 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">
                      <CheckCircle2 size={11} /> Free for the whole period
                    </span>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {dayGroups.map((group) => (
                        <div key={group.date.toDateString()} className="flex items-start gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-50 w-16 flex-shrink-0 pt-1.5">
                            {formatDateHeading(group.date)}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {group.blocks.map((block, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1"
                              >
                                <Clock size={10} /> {formatTimeRange(block)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
