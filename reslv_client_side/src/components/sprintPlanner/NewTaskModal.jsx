import { useState } from "react";
import api from "../../api/axios";

const TASK_TYPES = [
  { id: "new_feature", label: "New Feature" },
  { id: "bug", label: "Bug" },
  { id: "improvement", label: "Improvement" },
  { id: "chore", label: "Chore" },
];
const PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

// employees: [{ userId, name, remainingHours, segmentId, ... }] from GET
// /sprints/:id/capacity — remainingHours already excludes nothing (this is
// a brand-new task), so the live "remaining after this estimate" figure is
// just remainingHours - approximateHours, recomputed on every keystroke.
// segmentId/segmentName: this task is being created from inside that
// segment's swimlane on the board, so the team is locked (not a dropdown)
// and the assignee list is pre-scoped to that team's members. A null
// segmentId (the "Unassigned" swimlane) leaves the assignee list unfiltered.
export default function NewTaskModal({ sprintId, employees, segmentId, segmentName, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("new_feature");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [approximateHours, setApproximateHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const assignableEmployees = (employees || []).filter(
    (e) => !segmentId || e.segmentId === segmentId,
  );

  const selectedEmployee = employees?.find((e) => e.userId === assigneeId);
  const liveRemaining =
    selectedEmployee != null
      ? selectedEmployee.remainingHours - Number(approximateHours || 0)
      : null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || approximateHours === "") return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/sprint-planner/sprints/${sprintId}/tasks`, {
        title: title.trim(),
        description: description.trim(),
        taskType,
        priority,
        assigneeId: assigneeId || null,
        segmentId: segmentId || null,
        approximateHours: Number(approximateHours),
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
        <div>
          <h4 className="text-sm font-bold text-[var(--text-h)]">➕ New Task</h4>
          <p className="text-[11px] text-[var(--text)] opacity-70 mt-0.5">
            {segmentName ? `In ${segmentName}` : "Unassigned to a team"}
          </p>
        </div>

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

        <div>
          <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Type
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden"
            >
              {TASK_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden"
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Approx. hours
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={approximateHours}
              onChange={(e) => setApproximateHours(e.target.value)}
              className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden"
            />
          </div>
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
              {assignableEmployees.map((emp) => (
                <option key={emp.userId} value={emp.userId}>
                  {emp.name} — {emp.remainingHours}h left
                </option>
              ))}
            </select>
            {segmentId && assignableEmployees.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-1">No one is in this team yet.</p>
            )}
          </div>
        </div>

        {selectedEmployee && (
          <p className={`text-[11px] ${liveRemaining < 0 ? "text-red-500 font-semibold" : "text-[var(--text)] opacity-70"}`}>
            {selectedEmployee.name} will have {liveRemaining}h left in this sprint after this task.
          </p>
        )}

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
