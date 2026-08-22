import { useEffect, useState } from "react";
import api from "../../api/axios";

// Lets a task's current assignee divert it to another employee in the
// company — "employee can divert his own task request to other employee."
// If accepted, Task.assigneeId moves to them and sprint-hour allocation
// follows automatically (derived live, no separate bookkeeping).
export default function TaskRequestModal({ task, currentUserId, onClose, onSent }) {
  const [employees, setEmployees] = useState([]);
  const [toUserId, setToUserId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/sprint-planner/tasks/${task._id}/capacity`)
      .then((res) => setEmployees(res.data.employees || []))
      .catch(() => setEmployees([]));
  }, [task._id]);

  const teammates = employees.filter((e) => String(e.userId) !== String(currentUserId));

  const handleSend = async (e) => {
    e.preventDefault();
    if (!toUserId) return;
    setSending(true);
    setError("");
    try {
      await api.post("/sprint-planner/task-requests", {
        taskId: task._id,
        toUserId,
        message: message.trim(),
      });
      onSent();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send request.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
      <form
        onSubmit={handleSend}
        className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 w-full max-w-sm shadow-xl flex flex-col gap-4 animate-fade-in"
      >
        <h4 className="text-sm font-bold text-[var(--text-h)]">🤝 Divert Task</h4>
        <p className="text-[11px] text-[var(--text)] opacity-70">
          Ask a teammate to take over "{task.title}".
        </p>

        <div>
          <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
            Send to
          </label>
          <select
            autoFocus
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="w-full text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden"
          >
            <option value="">Select a teammate…</option>
            {teammates.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name} — {m.remainingHours}h left
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
            Message (optional)
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Why you need a hand…"
            className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden resize-none"
          />
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
            disabled={!toUserId || sending}
            className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] px-4 py-1.5 rounded cursor-pointer hover:opacity-90 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
