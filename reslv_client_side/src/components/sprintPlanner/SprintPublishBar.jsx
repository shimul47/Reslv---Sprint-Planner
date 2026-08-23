import { useState } from "react";
import { ChevronDown, Plus, Pencil } from "lucide-react";
import api from "../../api/axios";
import HelpTip from "./HelpTip.jsx";

export default function SprintPublishBar({
  sprints,
  activeSprintId,
  setActiveSprintId,
  activeSprint,
  onChanged,
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingDates, setEditingDates] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await api.post("/sprint-planner/sprints", {
        name: name.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
      });
      setName("");
      setStartDate("");
      setEndDate("");
      setCreating(false);
      await onChanged();
      setActiveSprintId(res.data.sprint._id);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create sprint.");
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    setBusy(true);
    try {
      await api.post(`/sprint-planner/sprints/${activeSprintId}/publish`);
      await onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to publish sprint.");
    } finally {
      setBusy(false);
    }
  };

  const openDateEditor = () => {
    setStartDate(
      activeSprint?.startDate ? activeSprint.startDate.slice(0, 10) : "",
    );
    setEndDate(activeSprint?.endDate ? activeSprint.endDate.slice(0, 10) : "");
    setEditingDates(true);
  };

  const handleSaveDates = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/sprint-planner/sprints/${activeSprintId}`, {
        startDate: startDate || null,
        endDate: endDate || null,
      });
      setEditingDates(false);
      await onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save sprint dates.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-[var(--color-border)]">
      <div className="relative">
        <select
          value={activeSprintId || ""}
          onChange={(e) => setActiveSprintId(e.target.value)}
          className="appearance-none text-sm font-semibold bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--text-h)] rounded-[var(--radius-sm)] pl-3 pr-8 py-1.5 focus:outline-hidden cursor-pointer"
        >
          {sprints.length === 0 && <option value="">No sprints yet</option>}
          {sprints.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
              {!s.published ? " (draft)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text)] opacity-60"
        />
      </div>

      {activeSprint && (
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-[var(--radius-sm)] ${
            activeSprint.published
              ? "bg-green-500/10 text-green-500"
              : "bg-[var(--color-muted)] text-[var(--text)]"
          }`}
        >
          {activeSprint.published
            ? "Published"
            : "Draft — hidden from employees"}
        </span>
      )}

      {activeSprint && !editingDates && (
        <button
          onClick={openDateEditor}
          className="flex items-center gap-1 text-[10px] text-[var(--text)] opacity-70 hover:opacity-100 cursor-pointer"
        >
          <Pencil size={10} />
          {activeSprint.startDate && activeSprint.endDate
            ? `${activeSprint.startDate.slice(0, 10)} → ${activeSprint.endDate.slice(0, 10)}`
            : "Set sprint dates"}
        </button>
      )}

      {editingDates && (
        <form onSubmit={handleSaveDates} className="flex items-center gap-1.5">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-[11px] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded px-1.5 py-1 focus:outline-hidden"
          />
          <span className="text-[10px] text-[var(--text)] opacity-60">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-[11px] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded px-1.5 py-1 focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={busy}
            className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[10px] font-semibold px-2 py-1 rounded cursor-pointer hover:opacity-90"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditingDates(false)}
            className="text-[10px] text-[var(--text)] opacity-70 hover:opacity-100 cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {activeSprint && !activeSprint.published && (
          <button
            onClick={handlePublish}
            disabled={busy}
            className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] font-bold px-3 py-1.5 rounded-[var(--radius-sm)] cursor-pointer hover:opacity-90 disabled:opacity-60"
          >
            Publish Sprint
          </button>
        )}
        {creating ? (
          <form onSubmit={handleCreate} className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              placeholder="Sprint name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded px-2 py-1.5 focus:outline-hidden w-32"
            />
            <input
              type="date"
              title="Start date (optional)"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-[11px] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded px-1.5 py-1.5 focus:outline-hidden"
            />
            <input
              type="date"
              title="End date (optional)"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-[11px] bg-[var(--color-input-background)] border border-[var(--color-border)] rounded px-1.5 py-1.5 focus:outline-hidden"
            />
            <button
              type="submit"
              className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] font-semibold px-2.5 py-1.5 rounded cursor-pointer hover:opacity-90"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="text-[11px] text-[var(--text)] opacity-70 hover:opacity-100 cursor-pointer"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 text-[11px] font-medium text-[var(--text)] hover:text-[var(--text-h)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-[var(--color-muted)] cursor-pointer"
          >
            <Plus size={12} /> New Sprint
          </button>
        )}
      </div>

      {error && (
        <span className="text-[11px] text-red-500 w-full">{error}</span>
      )}
    </div>
  );
}
