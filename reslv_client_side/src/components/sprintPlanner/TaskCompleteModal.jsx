import { useState } from "react";
import api from "../../api/axios";

// Captures actualHours on the todo/in_progress -> done transition. Used both
// by the employee's own "Mark Done" action and by an overseer completing a
// task on someone's behalf from the Sprint Board.
export default function TaskCompleteModal({ task, onClose, onCompleted }) {
  const [actualHours, setActualHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (actualHours === "" || Number(actualHours) < 0) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/sprint-planner/tasks/${task._id}/complete`, {
        actualHours: Number(actualHours),
      });
      onCompleted();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 w-full max-w-sm shadow-xl flex flex-col gap-4 animate-fade-in"
      >
        <h4 className="text-sm font-bold text-[var(--text-h)]">✅ Mark "{task.title}" Done</h4>
        <p className="text-[11px] text-[var(--text)] opacity-70">
          Approximate estimate was {task.approximateHours}h. How many hours did it actually take?
        </p>

        <div>
          <label className="block text-[10px] font-bold text-[var(--text)] uppercase tracking-wider mb-1">
            Actual hours
          </label>
          <input
            autoFocus
            type="number"
            min="0"
            step="0.5"
            value={actualHours}
            onChange={(e) => setActualHours(e.target.value)}
            className="w-full text-xs text-[var(--color-foreground)] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden"
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
            disabled={saving || actualHours === ""}
            className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] px-4 py-1.5 rounded cursor-pointer hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Mark Done"}
          </button>
        </div>
      </form>
    </div>
  );
}
