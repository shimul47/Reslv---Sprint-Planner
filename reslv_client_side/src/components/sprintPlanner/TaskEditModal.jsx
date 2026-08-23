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

// Overseer-only content editor, opened from the sprint board. Status only
// changes via drag-and-drop / the Done button on the board itself — this
// modal edits everything else, including reassignment and deletion.
export default function TaskEditModal({ task, employees, segments, allTasks, onClose, onSaved, onDeleted }) {
  const originalAssigneeId = task.assigneeId?._id || task.assigneeId || "";

  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
    taskType: task.taskType,
    priority: task.priority,
    segmentId: task.segmentId || "",
    assigneeId: originalAssigneeId,
    approximateHours: task.approximateHours ?? "",
    dependsOn: (task.dependsOn || []).map((d) => d._id || d),
  });

  // any other task in this sprint can be picked as a dependency — just not
  // itself, and not a task that already depends on this one (the server
  // rejects that too, but catching it here saves a round trip)
  const dependencyOptions = (allTasks || []).filter(
    (t) => t._id !== task._id && !(t.dependsOn || []).some((d) => (d._id || d) === task._id),
  );

  const toggleDependency = (taskId) => {
    setForm((prev) => ({
      ...prev,
      dependsOn: prev.dependsOn.includes(taskId)
        ? prev.dependsOn.filter((id) => id !== taskId)
        : [...prev.dependsOn, taskId],
    }));
  };
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const filterBySegment = (list, forSegmentId) =>
    (list || []).filter((e) => !forSegmentId || e.segmentId === forSegmentId);

  const assignableEmployees = filterBySegment(employees, form.segmentId);

  const handleSegmentChange = (value) => {
    setForm((prev) => ({
      ...prev,
      segmentId: value,
      assigneeId: filterBySegment(employees, value).some((e) => e.userId === prev.assigneeId)
        ? prev.assigneeId
        : "",
    }));
  };

  // The employees list already has this task's current allocation baked
  // into its current assignee's remainingHours, so add it back before
  // subtracting the (possibly edited) estimate — matches what a fresh
  // excludeTaskId fetch would show, without a second round trip.
  const selectedEmployee = employees?.find((e) => e.userId === form.assigneeId);
  const baselineRemaining =
    selectedEmployee != null
      ? selectedEmployee.remainingHours + (form.assigneeId === originalAssigneeId ? task.approximateHours || 0 : 0)
      : null;
  const liveRemaining =
    baselineRemaining != null ? baselineRemaining - Number(form.approximateHours || 0) : null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.patch(`/sprint-planner/tasks/${task._id}`, {
        title: form.title.trim(),
        description: form.description.trim(),
        taskType: form.taskType,
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        segmentId: form.segmentId || null,
        approximateHours: Number(form.approximateHours),
        dependsOn: form.dependsOn,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/sprint-planner/tasks/${task._id}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete task.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 w-full max-w-lg shadow-xl flex flex-col gap-4 animate-fade-in max-h-[85vh] overflow-y-auto">
        <h4 className="text-sm font-bold text-[var(--text-h)]">Task</h4>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
                Type
              </label>
              <select
                value={form.taskType}
                onChange={(e) => update("taskType", e.target.value)}
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
                value={form.priority}
                onChange={(e) => update("priority", e.target.value)}
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

          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Segment / Team
            </label>
            <select
              value={form.segmentId}
              onChange={(e) => handleSegmentChange(e.target.value)}
              className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden"
            >
              <option value="">All teams</option>
              {(segments || []).map((seg) => (
                <option key={seg._id} value={seg._id}>
                  {seg.name}
                </option>
              ))}
            </select>
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
                value={form.approximateHours}
                onChange={(e) => update("approximateHours", e.target.value)}
                className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
                Assignee
              </label>
              <select
                value={form.assigneeId}
                onChange={(e) => update("assigneeId", e.target.value)}
                className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden"
              >
                <option value="">Unassigned</option>
                {assignableEmployees.map((emp) => (
                  <option key={emp.userId} value={emp.userId}>
                    {emp.name} — {emp.remainingHours}h left
                  </option>
                ))}
              </select>
              {form.segmentId && assignableEmployees.length === 0 && (
                <p className="text-[10px] text-amber-600 mt-1">No one is in this team yet.</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Depends on (optional)
            </label>
            {dependencyOptions.length === 0 ? (
              <p className="text-[11px] opacity-60">No other tasks in this sprint yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto border border-[var(--color-border)] rounded p-2">
                {dependencyOptions.map((t) => (
                  <label key={t._id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.dependsOn.includes(t._id)}
                      onChange={() => toggleDependency(t._id)}
                    />
                    <span className="truncate">{t.title}</span>
                    {t.status !== "done" && (
                      <span className="text-[9px] opacity-60 flex-shrink-0">(not done yet)</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            <p className="text-[10px] text-[var(--text)] opacity-60 mt-1">
              This task can't be started until everything checked here is done.
            </p>
          </div>

          {selectedEmployee && (
            <p className={`text-[11px] -mt-2 ${liveRemaining < 0 ? "text-red-500 font-semibold" : "text-[var(--text)] opacity-70"}`}>
              {selectedEmployee.name} will have {liveRemaining}h left in this sprint after this task.
            </p>
          )}

          {error && <p className="text-[11px] text-red-500">{error}</p>}

          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={task.status === "done" || deleting || saving}
              title={task.status === "done" ? "A completed task can't be deleted." : undefined}
              className="text-[11px] font-medium text-red-500 hover:underline cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting…" : "Delete task"}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-[11px] px-3 py-1.5 rounded hover:bg-[var(--color-secondary)] cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] px-4 py-1.5 rounded cursor-pointer hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
