import { useState } from "react";
import api from "../../api/axios";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";

// Lets a task's current assignee hand it off / ask another teammate on the
// project to take it over — "employee can pass a request to another
// employee of the company."
export default function TaskRequestModal({ task, projectMembers, currentUserId, onClose, onSent }) {
  const { activeProject } = useSprintPlanner();
  const [toUserId, setToUserId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const teammates = (projectMembers || []).filter(
    (m) => String(m.userId?._id || m.userId) !== String(currentUserId),
  );

  const handleSend = async (e) => {
    e.preventDefault();
    if (!toUserId) return;
    setSending(true);
    setError("");
    try {
      await api.post(
        `/sprint-planner/projects/${activeProject._id}/tasks/${task._id}/requests`,
        { toUserId, message: message.trim() },
      );
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
        <h4 className="text-sm font-bold text-[var(--text-h)]">🤝 Request Help / Hand Off</h4>
        <p className="text-[11px] text-[var(--text)] opacity-70">
          Ask a teammate on this project to take over "{task.title}".
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
              <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                {m.userId?.name || "Unknown"} {m.title ? `— ${m.title}` : ""}
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
