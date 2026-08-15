import { useState } from "react";
import api from "../../api/axios";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";

const TYPE_OPTIONS = [
  { id: "feature", label: "Feature" },
  { id: "bug", label: "Bug" },
  { id: "chore", label: "Chore" },
];

// Popup editor for a Product Backlog Item — usable both from the backlog
// board and, later, from the sprint board's PBI swimlane header.
export default function PbiEditModal({ pbi, backlogId, backlogs, sprints, onClose, onSaved }) {
  const { activeProject, canManageActiveProject } = useSprintPlanner();
  const isNew = !pbi;

  const [form, setForm] = useState({
    title: pbi?.title || "",
    description: pbi?.description || "",
    type: pbi?.type || "feature",
    storyPoints: pbi?.storyPoints ?? "",
    effortHours: pbi?.effortHours ?? "",
    backlogId: pbi?.backlogId || backlogId || backlogs?.[0]?._id || "",
    sprintId: pbi?.sprintId?._id || pbi?.sprintId || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError("");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      storyPoints: form.storyPoints === "" ? null : Number(form.storyPoints),
      effortHours: form.effortHours === "" ? null : Number(form.effortHours),
      backlogId: form.backlogId,
      sprintId: form.sprintId || null,
    };

    try {
      if (isNew) {
        await api.post(`/sprint-planner/projects/${activeProject._id}/pbis`, payload);
      } else {
        await api.patch(`/sprint-planner/projects/${activeProject._id}/pbis/${pbi._id}`, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this backlog item?")) return;
    try {
      await api.delete(`/sprint-planner/projects/${activeProject._id}/pbis/${pbi._id}`);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete item.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSave}
        className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 w-full max-w-md shadow-xl flex flex-col gap-4 animate-fade-in"
      >
        <h4 className="text-sm font-bold text-[var(--text-h)]">
          {isNew ? "➕ New Backlog Item" : "✏️ Edit Backlog Item"}
        </h4>

        <div>
          <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
            Title
          </label>
          <input
            autoFocus
            type="text"
            disabled={!canManageActiveProject}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            rows={3}
            disabled={!canManageActiveProject}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden resize-none disabled:opacity-60"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Type
            </label>
            <select
              disabled={!canManageActiveProject}
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden disabled:opacity-60"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Points
            </label>
            <input
              type="number"
              min="0"
              disabled={!canManageActiveProject}
              value={form.storyPoints}
              onChange={(e) => update("storyPoints", e.target.value)}
              className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Effort (h)
            </label>
            <input
              type="number"
              min="0"
              disabled={!canManageActiveProject}
              value={form.effortHours}
              onChange={(e) => update("effortHours", e.target.value)}
              className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden disabled:opacity-60"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Backlog
            </label>
            <select
              disabled={!canManageActiveProject}
              value={form.backlogId}
              onChange={(e) => update("backlogId", e.target.value)}
              className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden disabled:opacity-60"
            >
              {backlogs?.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Sprint
            </label>
            <select
              disabled={!canManageActiveProject}
              value={form.sprintId}
              onChange={(e) => update("sprintId", e.target.value)}
              className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden disabled:opacity-60"
            >
              <option value="">Not in a sprint</option>
              {sprints?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-[11px] text-red-500">{error}</p>}

        <div className="flex justify-between items-center mt-2">
          {!isNew && canManageActiveProject ? (
            <button
              type="button"
              onClick={handleDelete}
              className="text-[11px] font-medium text-red-500 hover:underline cursor-pointer"
            >
              Delete
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-[11px] px-3 py-1.5 rounded hover:bg-[var(--color-secondary)] cursor-pointer"
            >
              Cancel
            </button>
            {canManageActiveProject && (
              <button
                type="submit"
                disabled={saving}
                className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] px-4 py-1.5 rounded cursor-pointer hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
