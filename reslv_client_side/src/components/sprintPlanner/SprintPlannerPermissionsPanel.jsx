import { useEffect, useState } from "react";
import api from "../../api/axios";

const TOGGLES = [
  {
    key: "employeesCanCreateTasks",
    label: "Employees can create tasks",
    description: "Lets any project member add tasks to a sprint, not just managers.",
  },
  {
    key: "employeesCanEditBacklog",
    label: "Employees can edit the backlog",
    description: "Lets any project member create/edit/reorder backlogs and backlog items.",
  },
  {
    key: "employeesCanPublishSprints",
    label: "Employees can publish sprints",
    description: "Lets any project member publish a sprint, not just managers.",
  },
];

// Admin/superadmin-only Administration-section permissions for the Sprint
// Planner module — company-wide defaults layered on top of each project's
// manager/member membership roles.
export default function SprintPlannerPermissionsPanel({ companyId }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (companyId === undefined) return; // still resolving (superadmin scope not chosen yet)
    setLoading(true);
    setError("");
    api
      .get("/team/sprint-planner-settings", { params: companyId ? { companyId } : {} })
      .then((res) => setSettings(res.data.settings || {}))
      .catch((err) => setError(err.response?.data?.message || "Failed to load settings."))
      .finally(() => setLoading(false));
  }, [companyId]);

  const toggle = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    try {
      await api.patch(
        "/team/sprint-planner-settings",
        { [key]: next[key] },
        { params: companyId ? { companyId } : {} },
      );
    } catch (err) {
      setSettings(settings);
      setError(err.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[var(--background)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-[var(--color-border)]">
        <h2 className="text-xl font-semibold">Sprint Planner Permissions</h2>
        <p className="text-sm opacity-70 mt-1">
          Company-wide defaults that relax what a plain project "member" can do — a per-project
          "manager" can always do these regardless of these toggles.
        </p>
      </div>

      <div className="p-6 flex flex-col gap-4">
        {loading ? (
          <p className="text-sm opacity-60">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          TOGGLES.map((t) => (
            <label key={t.key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(settings?.[t.key])}
                onChange={() => toggle(t.key)}
                disabled={saving}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs opacity-60">{t.description}</p>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
