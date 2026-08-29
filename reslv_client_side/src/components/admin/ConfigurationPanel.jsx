import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { ChartCard } from "../shared/ChartPrimitives.jsx";

const SEVERITIES = ["low", "medium", "high", "critical"];
const PRIORITIES = ["low", "medium", "high"];

function NumberField({ label, value, onChange, min = 0 }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-[var(--text-h)] capitalize">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm text-[var(--text-h)]"
      />
    </label>
  );
}

function SaveButton({ onClick, saving, children = "Save" }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white disabled:opacity-50"
    >
      {saving ? "Saving..." : children}
    </button>
  );
}

// Configuration tab of the Admin panel — SLA policies, sprint-hour rules,
// and prioritization weights each save through their existing owner
// endpoint; reward rate and subscription tier are read-only here (edited
// on the Loyalty Points tab / Billing page respectively) to avoid two
// controls mutating the same field.
export default function ConfigurationPanel() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [slaTargets, setSlaTargets] = useState({ low: "", medium: "", high: "", critical: "" });
  const [autoAssignOnReply, setAutoAssignOnReply] = useState(true);
  const [supportHoursNote, setSupportHoursNote] = useState("");
  const [savingSla, setSavingSla] = useState(false);

  const [defaultSprintHours, setDefaultSprintHours] = useState("");
  const [workingHours, setWorkingHours] = useState({ startHour: 9, endHour: 17, timezone: "Asia/Dhaka" });
  const [savingSprint, setSavingSprint] = useState(false);

  const [ticketSeverityWeights, setTicketSeverityWeights] = useState({ low: "", medium: "", high: "", critical: "" });
  const [taskPriorityWeights, setTaskPriorityWeights] = useState({ low: "", medium: "", high: "" });
  const [savingWeights, setSavingWeights] = useState(false);

  const fetchConfig = () => {
    setLoading(true);
    setError("");
    api
      .get("/admin-config")
      .then((res) => {
        const data = res.data;
        setConfig(data);
        setSlaTargets({ ...data.ticketSettings.slaTargets });
        setAutoAssignOnReply(data.ticketSettings.autoAssignOnReply);
        setSupportHoursNote(data.ticketSettings.supportHoursNote);
        setDefaultSprintHours(data.sprintSettings.defaultSprintHours);
        setWorkingHours({ ...data.sprintSettings.workingHours });
        setTicketSeverityWeights({ ...data.prioritizationWeights.ticketSeverity });
        setTaskPriorityWeights({ ...data.prioritizationWeights.taskPriority });
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load configuration."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  };

  const saveSla = async () => {
    setSavingSla(true);
    try {
      await api.patch("/tickets/settings", { slaTargets, autoAssignOnReply, supportHoursNote });
      flash("SLA policy saved.");
      fetchConfig();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save SLA policy.");
    } finally {
      setSavingSla(false);
    }
  };

  const saveSprint = async () => {
    setSavingSprint(true);
    try {
      await api.patch("/team/sprint-planner-settings", {
        defaultSprintHours: Number(defaultSprintHours),
        workingHours,
      });
      flash("Sprint-hour rules saved.");
      fetchConfig();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save sprint-hour rules.");
    } finally {
      setSavingSprint(false);
    }
  };

  const saveWeights = async () => {
    setSavingWeights(true);
    try {
      await api.patch("/admin-config/prioritization-weights", {
        ticketSeverity: ticketSeverityWeights,
        taskPriority: taskPriorityWeights,
      });
      flash("Prioritization weights saved.");
      fetchConfig();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save prioritization weights.");
    } finally {
      setSavingWeights(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-xs text-[var(--text)] opacity-60">Loading configuration...</div>;
  }

  return (
    <div className="p-6 flex flex-col gap-5 max-w-4xl mx-auto">
      {notice && <p className="text-xs text-green-600 dark:text-green-400">{notice}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}

      <ChartCard title="SLA policies" subtitle="Minutes-to-target by severity, plus auto-assign and support-hours note." height="auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SEVERITIES.map((sev) => (
            <NumberField
              key={sev}
              label={`${sev} (mins)`}
              value={slaTargets[sev] ?? ""}
              onChange={(v) => setSlaTargets((s) => ({ ...s, [sev]: v }))}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs mt-3">
          <input
            type="checkbox"
            checked={autoAssignOnReply}
            onChange={(e) => setAutoAssignOnReply(e.target.checked)}
          />
          <span className="text-[var(--text-h)]">Auto-assign a ticket to the replying agent</span>
        </label>
        <label className="flex flex-col gap-1 text-xs mt-3">
          <span className="font-semibold text-[var(--text-h)]">Support hours note</span>
          <input
            type="text"
            maxLength={200}
            value={supportHoursNote}
            onChange={(e) => setSupportHoursNote(e.target.value)}
            className="bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm text-[var(--text-h)]"
          />
        </label>
        <div className="mt-3">
          <SaveButton onClick={saveSla} saving={savingSla} />
        </div>
      </ChartCard>

      <ChartCard title="Sprint-hour rules" subtitle="Default per-employee sprint capacity and the company's working day." height="auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberField
            label="Default sprint hours"
            value={defaultSprintHours}
            onChange={setDefaultSprintHours}
          />
          <NumberField
            label="Working day start hour"
            value={workingHours.startHour}
            onChange={(v) => setWorkingHours((w) => ({ ...w, startHour: v }))}
          />
          <NumberField
            label="Working day end hour"
            value={workingHours.endHour}
            onChange={(v) => setWorkingHours((w) => ({ ...w, endHour: v }))}
          />
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-[var(--text-h)]">Timezone</span>
            <input
              type="text"
              value={workingHours.timezone}
              onChange={(e) => setWorkingHours((w) => ({ ...w, timezone: e.target.value }))}
              className="bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm text-[var(--text-h)]"
            />
          </label>
        </div>
        <div className="mt-3">
          <SaveButton onClick={saveSprint} saving={savingSprint} />
        </div>
      </ChartCard>

      <ChartCard title="Prioritization weights" subtitle="Higher weight sorts first — drives the ticket inbox and My Tasks order." height="auto">
        <p className="text-[11px] font-semibold text-[var(--text-h)] mb-2">Ticket severity</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {SEVERITIES.map((sev) => (
            <NumberField
              key={sev}
              label={sev}
              value={ticketSeverityWeights[sev] ?? ""}
              onChange={(v) => setTicketSeverityWeights((s) => ({ ...s, [sev]: v }))}
            />
          ))}
        </div>
        <p className="text-[11px] font-semibold text-[var(--text-h)] mb-2">Task priority</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PRIORITIES.map((p) => (
            <NumberField
              key={p}
              label={p}
              value={taskPriorityWeights[p] ?? ""}
              onChange={(v) => setTaskPriorityWeights((s) => ({ ...s, [p]: v }))}
            />
          ))}
        </div>
        <div className="mt-3">
          <SaveButton onClick={saveWeights} saving={savingWeights} />
        </div>
      </ChartCard>

      <ChartCard title="Reward conversion rate" subtitle="Points-per-dollar for loyalty redemptions." height="auto">
        <p className="text-sm text-[var(--text-h)]">
          <span className="font-semibold">{config?.loyalty?.pointsPerDollar}</span> points = $1 discount
        </p>
        <button
          onClick={() => navigate("/admin/panel/loyalty")}
          className="text-xs font-semibold text-[var(--color-primary)] mt-2"
        >
          Manage in Loyalty Points tab →
        </button>
      </ChartCard>

      <ChartCard title="Subscription tier" subtitle="Current plan, status, and feature access." height="auto">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <p className="text-[var(--text-h)] capitalize">
            <span className="font-semibold">{config?.subscription?.id}</span> — {config?.subscription?.status}
          </p>
          <p className="text-xs text-[var(--text)] opacity-70">
            Invite limit: {config?.subscription?.inviteLimit ?? "Unlimited"}
          </p>
        </div>
        <ul className="text-xs text-[var(--text)] opacity-70 mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(config?.subscription?.features || {}).map(([key, enabled]) => (
            <li key={key} className={enabled ? "" : "line-through opacity-50"}>
              {key}
            </li>
          ))}
        </ul>
        <button
          onClick={() => navigate("/billing")}
          className="text-xs font-semibold text-[var(--color-primary)] mt-3"
        >
          Manage Billing →
        </button>
      </ChartCard>
    </div>
  );
}
