import { useEffect, useState } from "react";
import api from "../../api/axios";

// Admin/superadmin-only Sprint Planner capacity settings: a company-wide
// default sprint-hour allowance, plus an optional override for one specific
// sprint (e.g. a crunch or a short sprint needs a different number for
// everyone). The override only ever applies to the sprint it was set on —
// a new sprint always starts back at the company default.
export default function SprintPlannerCapacityPanel({ companyId }) {
  const [defaultSprintHours, setDefaultSprintHours] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [sprintOverride, setSprintOverride] = useState("");
  const [savingSprintOverride, setSavingSprintOverride] = useState(false);

  const params = companyId ? { companyId } : {};

  useEffect(() => {
    if (companyId === undefined) return; // still resolving (superadmin scope not chosen yet)
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/team/sprint-planner-settings", { params }),
      api.get("/sprint-planner/sprints", { params }),
    ])
      .then(([settingsRes, sprintsRes]) => {
        setDefaultSprintHours(String(settingsRes.data.defaultSprintHours ?? 60));
        const list = sprintsRes.data.sprints || [];
        setSprints(list);
        setSelectedSprintId((current) => (list.some((s) => s._id === current) ? current : list[0]?._id || ""));
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load settings."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    const sprint = sprints.find((s) => s._id === selectedSprintId);
    setSprintOverride(sprint?.capacityHoursOverride == null ? "" : String(sprint.capacityHoursOverride));
  }, [selectedSprintId, sprints]);

  const saveDefault = async (e) => {
    e.preventDefault();
    if (defaultSprintHours === "" || Number(defaultSprintHours) < 0) return;
    setSaving(true);
    setError("");
    try {
      await api.patch(
        "/team/sprint-planner-settings",
        { defaultSprintHours: Number(defaultSprintHours) },
        { params },
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const saveSprintOverride = async (rawValue) => {
    const raw = rawValue !== undefined ? rawValue : sprintOverride;
    const value = raw === "" ? null : Number(raw);
    if (value !== null && value < 0) return;
    setSavingSprintOverride(true);
    setError("");
    try {
      const res = await api.patch(`/sprint-planner/sprints/${selectedSprintId}`, {
        capacityHoursOverride: value,
      });
      setSprints((prev) => prev.map((s) => (s._id === selectedSprintId ? res.data.sprint : s)));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save this sprint's override.");
    } finally {
      setSavingSprintOverride(false);
    }
  };

  return (
    <div className="bg-[var(--background)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-[var(--color-border)] text-center">
        <h2 className="text-xl font-semibold">Sprint Planner Capacity</h2>
        <p className="text-sm opacity-70 mt-1">
          Set the default sprint-hour allowance for the company, and optionally override it for one
          specific sprint — every new sprint starts back at the default.
        </p>
      </div>

      <div className="p-6 flex flex-col items-center gap-6">
        {loading ? (
          <p className="text-sm opacity-60">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          // Both rows share the same [label | input | actions] grid columns,
          // so the inputs line up in one straight column.
          <div className="w-full max-w-md mx-auto flex flex-col gap-6">
            <form
              onSubmit={saveDefault}
              className="grid grid-cols-[9rem_9rem_auto] items-center gap-3"
            >
              <label className="text-sm font-medium opacity-70 text-right">
                Default hours per sprint
              </label>
              <input
                type="number"
                min="0"
                value={defaultSprintHours}
                onChange={(e) => setDefaultSprintHours(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-center focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              <button
                type="submit"
                disabled={saving}
                className="justify-self-start bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </form>

            <div className="flex flex-col items-center">
              <p className="text-sm font-medium opacity-70 mb-2">Override for one sprint</p>
              {sprints.length === 0 ? (
                <p className="text-sm opacity-60">No sprints yet.</p>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  <div className="grid grid-cols-[9rem_9rem_auto] items-center gap-3">
                    <label className="text-sm opacity-70 text-right">Sprint</label>
                    <select
                      value={selectedSprintId}
                      onChange={(e) => setSelectedSprintId(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-2 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    >
                      {sprints.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <span />
                  </div>

                  <div className="grid grid-cols-[9rem_9rem_auto] items-center gap-3">
                    <label className="text-sm opacity-70 text-right">Hours for this sprint</label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Default (${defaultSprintHours || 60})`}
                      value={sprintOverride}
                      onChange={(e) => setSprintOverride(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-sm text-center focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => saveSprintOverride()}
                        disabled={savingSprintOverride}
                        className="text-xs text-[var(--color-primary)] font-semibold hover:underline cursor-pointer disabled:opacity-60"
                      >
                        Save
                      </button>
                      {sprintOverride !== "" && (
                        <button
                          type="button"
                          onClick={() => {
                            setSprintOverride("");
                            saveSprintOverride("");
                          }}
                          className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
