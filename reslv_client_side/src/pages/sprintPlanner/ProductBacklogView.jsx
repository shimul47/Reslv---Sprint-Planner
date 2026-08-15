import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../api/axios";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";
import PbiEditModal from "../../components/sprintPlanner/PbiEditModal.jsx";
import HelpTip from "../../components/sprintPlanner/HelpTip.jsx";

const TYPE_BADGE = {
  feature: { label: "Feature", className: "bg-[#D3ADF7] text-neutral-900" },
  bug: { label: "Bug", className: "bg-[#FFA39E] text-neutral-900" },
  chore: { label: "Chore", className: "bg-[#85E3B2] text-neutral-900" },
};

export default function ProductBacklogView() {
  const { activeProject, canManageActiveProject } = useSprintPlanner();
  const [backlogs, setBacklogs] = useState([]);
  const [pbis, setPbis] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [inheritedBacklogs, setInheritedBacklogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // { pbi, backlogId } | null
  const [addingBacklog, setAddingBacklog] = useState(false);
  const [newBacklogName, setNewBacklogName] = useState("");

  const load = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError("");
    try {
      const [backlogsRes, pbisRes, sprintsRes, inheritedRes] = await Promise.all([
        api.get(`/sprint-planner/projects/${activeProject._id}/backlogs`),
        api.get(`/sprint-planner/projects/${activeProject._id}/pbis`),
        api.get(`/sprint-planner/projects/${activeProject._id}/sprints`),
        api.get(`/sprint-planner/projects/${activeProject._id}/inherited-backlogs`),
      ]);
      setBacklogs(backlogsRes.data.backlogs || []);
      setPbis(pbisRes.data.pbis || []);
      setSprints(sprintsRes.data.sprints || []);
      setInheritedBacklogs(inheritedRes.data.backlogs || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load the product backlog.");
    } finally {
      setLoading(false);
    }
  }, [activeProject?._id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateBacklog = async (e) => {
    e.preventDefault();
    if (!newBacklogName.trim()) return;
    try {
      await api.post(`/sprint-planner/projects/${activeProject._id}/backlogs`, {
        name: newBacklogName.trim(),
      });
      setNewBacklogName("");
      setAddingBacklog(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create backlog.");
    }
  };

  const pbisFor = (backlogId) =>
    pbis
      .filter((p) => p.backlogId === backlogId)
      .sort((a, b) => a.position - b.position);

  // Reorders (and, if the drop crossed columns, re-parents) the dragged PBI,
  // then persists every changed position in one batch of PATCH calls.
  const movePbi = async (draggedId, targetBacklogId, beforePbiId) => {
    const dragged = pbis.find((p) => p._id === draggedId);
    if (!dragged) return;

    const withoutDragged = pbis.filter((p) => p._id !== draggedId);
    const targetList = withoutDragged
      .filter((p) => p.backlogId === targetBacklogId)
      .sort((a, b) => a.position - b.position);

    const insertAt = beforePbiId
      ? targetList.findIndex((p) => p._id === beforePbiId)
      : targetList.length;
    targetList.splice(insertAt === -1 ? targetList.length : insertAt, 0, {
      ...dragged,
      backlogId: targetBacklogId,
    });

    const updates = targetList.map((p, index) => ({ ...p, position: index }));
    const others = withoutDragged.filter((p) => p.backlogId !== targetBacklogId);
    setPbis([...others, ...updates]);

    const changed = updates.filter((p, index) => {
      const original = pbis.find((o) => o._id === p._id);
      return !original || original.position !== index || original.backlogId !== targetBacklogId;
    });

    try {
      await Promise.all(
        changed.map((p) =>
          api.patch(`/sprint-planner/projects/${activeProject._id}/pbis/${p._id}`, {
            backlogId: p.backlogId,
            position: p.position,
          }),
        ),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save the new order.");
      load();
    }
  };

  const onDragStart = (e, pbiId) => {
    if (!canManageActiveProject) return;
    e.dataTransfer.setData("text/plain", pbiId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropOnCard = (e, targetBacklogId, targetPbiId) => {
    if (!canManageActiveProject) return;
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== targetPbiId) movePbi(draggedId, targetBacklogId, targetPbiId);
  };

  const onDropOnColumn = (e, targetBacklogId) => {
    if (!canManageActiveProject) return;
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId) movePbi(draggedId, targetBacklogId, null);
  };

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[var(--text)] opacity-60">
        {loading ? "Loading…" : "Select or create a project to see its backlog."}
      </div>
    );
  }

  return (
    <div className="w-full text-left p-6 overflow-x-auto select-none flex flex-col gap-6">
      <HelpTip title="Product Backlog">
        Each column is a separate backlog — a project can have more than one (e.g. one per
        team or product area). Drag cards to reorder or move them between backlogs; click a
        card to edit points, effort, and which sprint it belongs to.
      </HelpTip>
      {canManageActiveProject && (
        <div>
          {addingBacklog ? (
            <form onSubmit={handleCreateBacklog} className="flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                placeholder="Backlog name"
                value={newBacklogName}
                onChange={(e) => setNewBacklogName(e.target.value)}
                className="text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded px-2 py-1.5 focus:outline-hidden w-48"
              />
              <button
                type="submit"
                className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] font-semibold px-2.5 py-1.5 rounded cursor-pointer hover:opacity-90"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setAddingBacklog(false)}
                className="text-[11px] text-[var(--text)] opacity-70 hover:opacity-100 cursor-pointer"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setAddingBacklog(true)}
              className="flex items-center gap-1.5 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold px-4 py-2 rounded-[var(--radius-sm)] shadow-[var(--shadow)] cursor-pointer hover:opacity-90"
            >
              <Plus size={13} /> Add Product Backlog
            </button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {loading ? (
        <p className="text-xs text-[var(--text)] opacity-60">Loading backlog…</p>
      ) : backlogs.length === 0 ? (
        <p className="text-xs text-[var(--text)] opacity-60">
          No product backlogs yet. {canManageActiveProject && "Add one above to get started."}
        </p>
      ) : (
        <div className="flex gap-6 items-start min-w-[900px]">
          {backlogs.map((backlog) => (
            <div key={backlog._id} className="flex-1 flex flex-col gap-3 min-w-[260px]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight text-[var(--text-h)]">
                  {backlog.name}
                  {backlog.isDefault && (
                    <span className="ml-1.5 text-[9px] font-normal uppercase tracking-wider text-[var(--text)] opacity-50">
                      default
                    </span>
                  )}
                </h3>
                {canManageActiveProject && (
                  <button
                    onClick={() =>
                      setEditing({ pbi: null, backlogId: backlog._id })
                    }
                    title="Add item"
                    className="w-5 h-5 rounded-full border border-dashed border-[var(--color-border)] text-[var(--text)] hover:text-[var(--text-h)] hover:bg-[var(--color-muted)] flex items-center justify-center text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                )}
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropOnColumn(e, backlog._id)}
                className="flex flex-col gap-2.5 min-h-[80px] pb-4"
              >
                {pbisFor(backlog._id).map((pbi) => {
                  const badge = TYPE_BADGE[pbi.type] || TYPE_BADGE.feature;
                  const sprintName =
                    typeof pbi.sprintId === "object" ? pbi.sprintId?.name : null;
                  return (
                    <div
                      key={pbi._id}
                      draggable={canManageActiveProject}
                      onDragStart={(e) => onDragStart(e, pbi._id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDropOnCard(e, backlog._id, pbi._id)}
                      onClick={() => setEditing({ pbi, backlogId: backlog._id })}
                      className={`bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 shadow-[var(--shadow)] hover:border-[var(--color-primary)] transition-colors ${canManageActiveProject ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                    >
                      <p className="text-xs font-semibold text-[var(--text-h)] mb-1.5 line-clamp-2">
                        {pbi.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-xs uppercase ${badge.className}`}>
                          {badge.label}
                        </span>
                        {pbi.storyPoints != null && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-[var(--color-muted)] text-[var(--text-h)]">
                            {pbi.storyPoints} pts
                          </span>
                        )}
                        {pbi.effortHours != null && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-[var(--color-muted)] text-[var(--text-h)]">
                            {pbi.effortHours}h
                          </span>
                        )}
                        {sprintName && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-[var(--color-secondary)] text-[var(--text-h)]">
                            in {sprintName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {pbisFor(backlog._id).length === 0 && (
                  <div className="w-full h-16 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] opacity-40 flex items-center justify-center text-[10px] text-[var(--text)]">
                    Empty
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {inheritedBacklogs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)] opacity-70">
            Shared from parent projects
          </p>
          <div className="flex flex-wrap gap-3">
            {inheritedBacklogs.map((b) => (
              <div
                key={b._id}
                className="bg-[var(--color-muted)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs"
                title="Read-only — managed from its owning project"
              >
                <p className="font-semibold text-[var(--text-h)]">{b.name}</p>
                <p className="text-[10px] text-[var(--text)] opacity-70">
                  {b.itemCount} item{b.itemCount === 1 ? "" : "s"} · from {b.sourceProjectName}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <PbiEditModal
          pbi={editing.pbi}
          backlogId={editing.backlogId}
          backlogs={backlogs}
          sprints={sprints}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
