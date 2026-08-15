import { useContext, useEffect, useState } from "react";
import api from "../../api/axios";
import { AuthContext } from "../../context/AuthContext.jsx";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";
import TaskRequestModal from "./TaskRequestModal.jsx";

const STATUS_OPTIONS = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

// Popup editor for a Task, opened directly from the sprint board. A manager
// can edit everything; a plain assignee can only move status, adjust
// remaining hours, and log time / request a hand-off.
export default function TaskEditModal({ task, pbi, projectMembers, canManage, onClose, onSaved }) {
  const { user } = useContext(AuthContext);
  const { activeProject } = useSprintPlanner();
  const isSelfAssignee = String(task.assigneeId?._id || task.assigneeId || "") === String(user?.id);

  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
    assigneeId: task.assigneeId?._id || task.assigneeId || "",
    estimateHours: task.estimateHours ?? "",
    status: task.status,
    remainingHours: task.remainingHours ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [logHours, setLogHours] = useState("");
  const [logComment, setLogComment] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);

  const loadLogs = async () => {
    try {
      const res = await api.get(
        `/sprint-planner/projects/${activeProject._id}/tasks/${task._id}/timelogs`,
      );
      setLogs(res.data.logs || []);
    } catch {
      // Non-critical — the modal still works without history.
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task._id]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const canEdit = canManage || isSelfAssignee;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = { status: form.status, remainingHours: form.remainingHours === "" ? null : Number(form.remainingHours) };
    if (canManage) {
      Object.assign(payload, {
        title: form.title.trim(),
        description: form.description.trim(),
        assigneeId: form.assigneeId || null,
        estimateHours: form.estimateHours === "" ? null : Number(form.estimateHours),
      });
    }

    try {
      await api.patch(
        `/sprint-planner/projects/${activeProject._id}/tasks/${task._id}`,
        payload,
      );
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogTime = async (e) => {
    e.preventDefault();
    if (logHours === "") return;
    try {
      await api.post(
        `/sprint-planner/projects/${activeProject._id}/tasks/${task._id}/timelogs`,
        {
          hours: Number(logHours),
          comment: logComment.trim(),
          remainingHours: form.remainingHours === "" ? undefined : Number(form.remainingHours),
        },
      );
      setLogHours("");
      setLogComment("");
      loadLogs();
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to log time.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 w-full max-w-lg shadow-xl flex flex-col gap-4 animate-fade-in max-h-[85vh] overflow-y-auto">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text)] opacity-60">
            {pbi?.title}
          </span>
          <h4 className="text-sm font-bold text-[var(--text-h)]">Task</h4>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              disabled={!canManage}
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
              rows={2}
              disabled={!canManage}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden resize-none disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
                Assignee
              </label>
              <select
                disabled={!canManage}
                value={form.assigneeId}
                onChange={(e) => update("assigneeId", e.target.value)}
                className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden disabled:opacity-60"
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
                Status
              </label>
              <select
                disabled={!canEdit}
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden disabled:opacity-60"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
                Estimate (h)
              </label>
              <input
                type="number"
                min="0"
                disabled={!canManage}
                value={form.estimateHours}
                onChange={(e) => update("estimateHours", e.target.value)}
                className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
                Remaining (h)
              </label>
              <input
                type="number"
                min="0"
                disabled={!canEdit}
                value={form.remainingHours}
                onChange={(e) => update("remainingHours", e.target.value)}
                className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden disabled:opacity-60"
              />
            </div>
          </div>

          {error && <p className="text-[11px] text-red-500">{error}</p>}

          <div className="flex justify-between items-center pt-1">
            {isSelfAssignee && (
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="text-[11px] font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
              >
                🤝 Request help / hand off
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-[11px] px-3 py-1.5 rounded hover:bg-[var(--color-secondary)] cursor-pointer"
              >
                Close
              </button>
              {canEdit && (
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

        {/* Time logging directly from the task popup */}
        <div className="border-t border-[var(--color-border)] pt-4">
          <span className="text-[10px] font-bold text-[var(--text)] uppercase tracking-wider block mb-2">
            ⏱ Time Log
          </span>

          {canEdit && (
            <form onSubmit={handleLogTime} className="flex items-center gap-1.5 mb-3">
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="Hours"
                value={logHours}
                onChange={(e) => setLogHours(e.target.value)}
                className="w-16 text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden"
              />
              <input
                type="text"
                placeholder="Comment (optional)"
                value={logComment}
                onChange={(e) => setLogComment(e.target.value)}
                className="flex-1 text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-1.5 focus:outline-hidden"
              />
              <button
                type="submit"
                className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-[10px] font-medium px-2.5 py-1.5 rounded hover:bg-[var(--color-secondary)] cursor-pointer"
              >
                Log
              </button>
            </form>
          )}

          <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
            {logs.length === 0 && (
              <p className="text-[10px] text-[var(--text)] opacity-50">No time logged yet.</p>
            )}
            {logs.map((log) => (
              <div key={log._id} className="text-[10px] text-[var(--text)] flex justify-between gap-2">
                <span className="truncate">
                  <strong className="text-[var(--text-h)]">{log.userId?.name || "Someone"}</strong>{" "}
                  logged {log.hours}h {log.comment ? `— ${log.comment}` : ""}
                </span>
                <span className="opacity-50 flex-shrink-0">
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showRequestModal && (
        <TaskRequestModal
          task={task}
          projectMembers={projectMembers}
          currentUserId={user?.id}
          onClose={() => setShowRequestModal(false)}
          onSent={() => {
            setShowRequestModal(false);
            onSaved();
          }}
        />
      )}
    </div>
  );
}
