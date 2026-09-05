import { useState } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../../api/axios";

// Admin/superadmin-only CRUD for company-wide team segments (Web Team, QA
// Team, …) — created once, reused by every sprint's task-assignment picker.
// `segments`/`onChanged` come from the parent so the list stays in sync
// with the per-employee segment selector below it on the same page.
// `team`/`onTeamChanged` let each segment declare its own membership here,
// in addition to the per-row selector in the team table.
export default function SegmentsPanel({
  companyId,
  segments,
  onChanged,
  team,
  onTeamChanged,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [membersOpenId, setMembersOpenId] = useState(null);
  const [draftMemberIds, setDraftMemberIds] = useState([]);
  const [savingMembers, setSavingMembers] = useState(false);

  const params = companyId ? { companyId } : {};
  const employees = (team || []).filter((m) => m.type === "user");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      await api.post(
        "/segments",
        { name: name.trim(), description: description.trim() },
        { params },
      );
      setName("");
      setDescription("");
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create segment.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (segment) => {
    setEditingId(segment._id);
    setEditName(segment.name);
  };

  const saveEdit = async (segmentId) => {
    if (!editName.trim()) return;
    try {
      await api.patch(
        `/segments/${segmentId}`,
        { name: editName.trim() },
        { params },
      );
      setEditingId(null);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to rename segment.");
    }
  };

  const handleDelete = async (segment) => {
    if (
      !window.confirm(
        `Delete "${segment.name}"? Employees and tasks tagged with it will just become untagged — nothing else is deleted.`,
      )
    )
      return;
    try {
      await api.delete(`/segments/${segment._id}`, { params });
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete segment.");
    }
  };

  const toggleMembers = (segment) => {
    if (membersOpenId === segment._id) {
      setMembersOpenId(null);
      return;
    }
    setMembersOpenId(segment._id);
    setDraftMemberIds(
      employees.filter((e) => e.segmentId === segment._id).map((e) => e.id),
    );
  };

  const toggleDraftMember = (userId) => {
    setDraftMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const saveMembers = async (segmentId) => {
    setSavingMembers(true);
    setError("");
    try {
      await api.patch(
        `/segments/${segmentId}/members`,
        { userIds: draftMemberIds },
        { params },
      );
      setMembersOpenId(null);
      onTeamChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update members.");
    } finally {
      setSavingMembers(false);
    }
  };

  return (
    <div className="bg-[var(--background)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden mt-8">
      <div className="px-3 sm:px-6 py-4 border-b border-[var(--color-border)]">
        <h2 className="text-xl font-semibold">Teams</h2>
        <p className="text-sm opacity-70 mt-1">
          Set up your teams once (Web Team, QA Team, UI/UX etc.) and every
          sprint reuses this same structure when assigning tasks.
        </p>
      </div>

      <div className="p-3 sm:p-6 flex flex-col gap-4">
        {error && <p className="text-sm text-red-500">{error}</p>}

        <form
          onSubmit={handleCreate}
          className="flex flex-col md:flex-row gap-3 md:items-end"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium opacity-70 mb-1">
              Segment name
            </label>
            <input
              type="text"
              placeholder="e.g. Web Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium opacity-70 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              placeholder="What this team owns"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="flex items-center justify-center gap-1.5 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium hover:opacity-90 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            <Plus size={14} /> Add Segment
          </button>
        </form>

        <div className="flex flex-col divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-md)]">
          {(segments || []).length === 0 && (
            <p className="text-sm opacity-60 px-4 py-3">
              No segments yet — add your first team above.
            </p>
          )}
          {(segments || []).map((segment) => {
            const memberCount = employees.filter(
              (e) => e.segmentId === segment._id,
            ).length;
            const membersOpen = membersOpenId === segment._id;
            return (
              <div key={segment._id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  {editingId === segment._id ? (
                    <>
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <button
                        onClick={() => saveEdit(segment._id)}
                        className="text-xs text-[var(--color-primary)] font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs opacity-60 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {segment.name}
                        </p>
                        {segment.description && (
                          <p className="text-xs opacity-60 truncate">
                            {segment.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleMembers(segment)}
                        className="flex items-center gap-1 text-xs text-[var(--text)] opacity-70 hover:opacity-100 cursor-pointer whitespace-nowrap"
                      >
                        <Users size={13} /> {memberCount} member
                        {memberCount === 1 ? "" : "s"}
                        {membersOpen ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )}
                      </button>
                      <button
                        onClick={() => startEdit(segment)}
                        title="Rename"
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text)] opacity-70 hover:opacity-100 hover:bg-[var(--color-muted)] cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(segment)}
                        title="Delete"
                        className="p-1.5 rounded-[var(--radius-sm)] text-red-500 opacity-70 hover:opacity-100 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>

                {membersOpen && (
                  <div className="px-4 pb-4 bg-[var(--color-muted)]/30">
                    {employees.length === 0 ? (
                      <p className="text-xs opacity-60 pt-2">
                        No employees to assign yet.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5 pt-2 max-h-48 overflow-y-auto pr-1">
                        {employees.map((emp) => (
                          <label
                            key={emp.id}
                            className="flex items-center gap-2 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={draftMemberIds.includes(emp.id)}
                              onChange={() => toggleDraftMember(emp.id)}
                            />
                            <span className="truncate">{emp.name}</span>
                            {emp.segmentId && emp.segmentId !== segment._id && (
                              <span className="text-[10px] opacity-50 flex-shrink-0">
                                (currently on another team)
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 pt-3">
                      <button
                        onClick={() => saveMembers(segment._id)}
                        disabled={savingMembers}
                        className="text-xs text-[var(--color-primary)] font-semibold cursor-pointer disabled:opacity-60"
                      >
                        {savingMembers ? "Saving…" : "Save members"}
                      </button>
                      <button
                        onClick={() => setMembersOpenId(null)}
                        className="text-xs opacity-60 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
