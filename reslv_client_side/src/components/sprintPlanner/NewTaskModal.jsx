import { useState } from "react";
import api from "../../api/axios";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";

// Manager-only quick-create for a Task under a specific PBI + sprint.
export default function NewTaskModal({ pbi, sprintId, projectMembers, onClose, onCreated }) {
  const { activeProject } = useSprintPlanner();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [estimateHours, setEstimateHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/sprint-planner/projects/${activeProject._id}/tasks`, {
        pbiId: pbi._id,
        sprintId,
        title: title.trim(),
        assigneeId: assigneeId || null,
        estimateHours: estimateHours === "" ? null : Number(estimateHours),
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleCreate}
        className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 w-full max-w-sm shadow-xl flex flex-col gap-4 animate-fade-in"
      >
        <h4 className="text-sm font-bold text-[var(--text-h)]">➕ New Task</h4>
        <p className="text-[11px] text-[var(--text)] opacity-70">Under "{pbi.title}"</p>

        <div>
          <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
            Title
          </label>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden"
            >
              <option value="">Unassigned</option>
              {(projectMembers || []).map((m) => (
                <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                  {m.userId?.name || "Unknown"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Estimate (h)
            </label>
            <input
              type="number"
              min="0"
              value={estimateHours}
              onChange={(e) => setEstimateHours(e.target.value)}
              className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden"
            />
          </div>
        </div>

        {error && <p className="text-[11px] text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-[11px] px-3 py-1.5 rounded hover:bg-[var(--color-secondary)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] px-4 py-1.5 rounded cursor-pointer hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
