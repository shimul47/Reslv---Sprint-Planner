import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import api from "../../api/axios";

const STATUS_STYLES = {
  free: { color: "#22c55e", label: "Free now" },
  busy: { color: "#ef4444", label: "Busy now" },
  off_duty: { color: "#f59e0b", label: "Off duty" },
  unknown: { color: "#9898b8", label: "Not connected" },
};

// "Now" as a Date whose local getHours() reads like wall-clock time in the
// given IANA zone — JS has no built-in "current hour in timezone X", so
// round-tripping through a localized string is the standard trick.
function nowInZone(timezone) {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
}

function liveStatus(employee, workingHours) {
  if (!employee.connected) return "unknown";

  const hourThere = nowInZone(workingHours.timezone).getHours();
  const onTheClock = hourThere >= workingHours.startHour && hourThere < workingHours.endHour;
  if (!onTheClock) return "off_duty";

  const now = new Date();
  const busyNow = (employee.busy || []).some((b) => new Date(b.start) <= now && now <= new Date(b.end));
  return busyNow ? "busy" : "free";
}

// A live-feeling "who's around right now" strip. Busy blocks are refetched
// every 60s; the status itself is recomputed every 20s so someone crossing
// a working-hours boundary (or a stale calendar fetch expiring) updates
// without needing a manual refresh.
export default function FreeNowPanel() {
  const [employees, setEmployees] = useState([]);
  const [workingHours, setWorkingHours] = useState({ startHour: 9, endHour: 17, timezone: "Asia/Dhaka" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const [editingHours, setEditingHours] = useState(false);
  const [hoursDraft, setHoursDraft] = useState(workingHours);
  const [savingHours, setSavingHours] = useState(false);

  const load = async () => {
    try {
      const start = new Date();
      const end = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const res = await api.get("/calendar/team-availability", {
        params: { start: start.toISOString(), end: end.toISOString() },
      });
      setEmployees(res.data.employees || []);
      if (res.data.workingHours) setWorkingHours(res.data.workingHours);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load live status.");
    } finally {
      setLoading(false);
    }
  };

  const startEditingHours = () => {
    setHoursDraft(workingHours);
    setEditingHours(true);
  };

  const saveHours = async (e) => {
    e.preventDefault();
    if (Number(hoursDraft.startHour) >= Number(hoursDraft.endHour)) return;
    setSavingHours(true);
    setError("");
    try {
      const res = await api.patch("/team/sprint-planner-settings", {
        workingHours: {
          startHour: Number(hoursDraft.startHour),
          endHour: Number(hoursDraft.endHour),
          timezone: hoursDraft.timezone.trim() || "Asia/Dhaka",
        },
      });
      if (res.data.workingHours) setWorkingHours(res.data.workingHours);
      setEditingHours(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save working hours.");
    } finally {
      setSavingHours(false);
    }
  };

  useEffect(() => {
    load();
    const dataTimer = setInterval(load, 60_000);
    const clockTimer = setInterval(() => setTick((t) => t + 1), 20_000);
    return () => {
      clearInterval(dataTimer);
      clearInterval(clockTimer);
    };
  }, []);

  const rows = useMemo(
    () => employees.map((e) => ({ ...e, status: liveStatus(e, workingHours) })),
    // tick has no fields of its own — it only exists to force this recompute
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, workingHours, tick],
  );

  const localTimeThere = nowInZone(workingHours.timezone).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden">
      <div className="px-3 sm:px-6 py-4 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--text-h)]">Free Right Now</h3>

        {!editingHours ? (
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <p className="text-xs opacity-70">
              Working hours {workingHours.startHour}:00–{workingHours.endHour}:00 ({workingHours.timezone}) —
              it's {localTimeThere} there.
            </p>
            <button
              onClick={startEditingHours}
              className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              <Pencil size={10} /> Change
            </button>
          </div>
        ) : (
          <form onSubmit={saveHours} className="flex items-center gap-2 flex-wrap mt-2">
            <select
              value={hoursDraft.startHour}
              onChange={(e) => setHoursDraft((prev) => ({ ...prev, startHour: Number(e.target.value) }))}
              className="text-xs bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1 focus:outline-hidden"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{`${h}:00`}</option>
              ))}
            </select>
            <span className="text-xs opacity-60">to</span>
            <select
              value={hoursDraft.endHour}
              onChange={(e) => setHoursDraft((prev) => ({ ...prev, endHour: Number(e.target.value) }))}
              className="text-xs bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1 focus:outline-hidden"
            >
              {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                <option key={h} value={h}>{`${h}:00`}</option>
              ))}
            </select>
            <input
              type="text"
              value={hoursDraft.timezone}
              onChange={(e) => setHoursDraft((prev) => ({ ...prev, timezone: e.target.value }))}
              placeholder="Asia/Dhaka"
              className="w-32 text-xs bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1 focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={savingHours || Number(hoursDraft.startHour) >= Number(hoursDraft.endHour)}
              className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer disabled:opacity-50"
            >
              {savingHours ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditingHours(false)}
              className="text-[11px] opacity-60 hover:opacity-100 cursor-pointer"
            >
              Cancel
            </button>
            {Number(hoursDraft.startHour) >= Number(hoursDraft.endHour) && (
              <p className="text-[11px] text-red-500 w-full">Start must be before end.</p>
            )}
          </form>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {error && <p className="text-xs text-red-500">{error}</p>}
        {loading ? (
          <p className="text-xs opacity-60">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs opacity-60">No teammates yet.</p>
        ) : (
          rows.map((emp) => {
            const style = STATUS_STYLES[emp.status];
            return (
              <div key={emp.userId} className="flex items-center gap-2.5 text-sm">
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                    style={{ backgroundColor: style.color }}
                  />
                  <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: style.color }}
                  />
                </span>
                <span className="font-medium text-[var(--text-h)]">{emp.name}</span>
                <span className="text-[11px] opacity-60">{style.label}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
