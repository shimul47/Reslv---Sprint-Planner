import { useCallback, useContext, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../api/axios";
import { AuthContext } from "../../context/AuthContext.jsx";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";
import SprintPublishBar from "../../components/sprintPlanner/SprintPublishBar.jsx";
import TaskEditModal from "../../components/sprintPlanner/TaskEditModal.jsx";
import NewTaskModal from "../../components/sprintPlanner/NewTaskModal.jsx";

const STATUS_COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

export default function SprintBoardView() {
  const { user } = useContext(AuthContext);
  const { activeProject, canManageActiveProject } = useSprintPlanner();

  const [sprints, setSprints] = useState([]);
  const [activeSprintId, setActiveSprintId] = useState(null);
  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [pbis, setPbis] = useState([]);
  const [members, setMembers] = useState([]);
  const [inheritedSprints, setInheritedSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTask, setOpenTask] = useState(null); // { task, pbi } | null
  const [newTaskFor, setNewTaskFor] = useState(null); // pbi | null

  const loadSprints = useCallback(async () => {
    if (!activeProject) return;
    const [sprintsRes, inheritedRes] = await Promise.all([
      api.get(`/sprint-planner/projects/${activeProject._id}/sprints`),
      api.get(`/sprint-planner/projects/${activeProject._id}/inherited-sprints`),
    ]);
    const list = sprintsRes.data.sprints || [];
    setSprints(list);
    setInheritedSprints(inheritedRes.data.sprints || []);
    setActiveSprintId((current) => {
      if (current && list.some((s) => s._id === current)) return current;
      const active = list.find((s) => s.status === "active") || list[0];
      return active?._id || null;
    });
    return list;
  }, [activeProject?._id]);

  const loadMembers = useCallback(async () => {
    if (!activeProject) return;
    const res = await api.get(`/sprint-planner/projects/${activeProject._id}/members`);
    setMembers(res.data.members || []);
  }, [activeProject?._id]);

  const loadBoard = useCallback(async () => {
    if (!activeProject || !activeSprintId) {
      setSprint(null);
      setTasks([]);
      setPbis([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/sprint-planner/projects/${activeProject._id}/sprints/${activeSprintId}/board`,
      );
      setSprint(res.data.sprint);
      setTasks(res.data.tasks || []);
      setPbis(res.data.pbis || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load the sprint board.");
    } finally {
      setLoading(false);
    }
  }, [activeProject?._id, activeSprintId]);

  useEffect(() => {
    loadSprints();
    loadMembers();
  }, [loadSprints, loadMembers]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const tasksFor = (pbiId, status) =>
    tasks
      .filter((t) => t.pbiId === pbiId && t.status === status)
      .sort((a, b) => a.position - b.position);

  const canEditTask = (task) =>
    canManageActiveProject || String(task.assigneeId?._id || task.assigneeId || "") === String(user?.id);

  const moveTask = async (draggedId, pbiId, targetStatus, beforeTaskId) => {
    const dragged = tasks.find((t) => t._id === draggedId);
    if (!dragged || !canEditTask(dragged)) return;

    const withoutDragged = tasks.filter((t) => t._id !== draggedId);
    const targetList = withoutDragged
      .filter((t) => t.pbiId === pbiId && t.status === targetStatus)
      .sort((a, b) => a.position - b.position);

    const insertAt = beforeTaskId ? targetList.findIndex((t) => t._id === beforeTaskId) : targetList.length;
    targetList.splice(insertAt === -1 ? targetList.length : insertAt, 0, {
      ...dragged,
      status: targetStatus,
    });

    const updates = targetList.map((t, index) => ({ ...t, position: index }));
    const others = withoutDragged.filter((t) => !(t.pbiId === pbiId && t.status === targetStatus));
    setTasks([...others, ...updates]);

    const changed = updates.filter((t) => {
      const original = tasks.find((o) => o._id === t._id);
      return !original || original.position !== t.position || original.status !== targetStatus;
    });

    try {
      await Promise.all(
        changed.map((t) =>
          api.patch(`/sprint-planner/projects/${activeProject._id}/tasks/${t._id}`, {
            status: t.status,
            position: t.position,
          }),
        ),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save the board changes.");
      loadBoard();
    }
  };

  // One-click "burn an hour" — the actual "log time directly on the sprint
  // board" control. Full history + custom amounts live in the task popup.
  const quickLogHour = async (task) => {
    if (!canEditTask(task)) return;
    const current = task.remainingHours ?? task.estimateHours ?? 0;
    const nextRemaining = Math.max(0, current - 1);
    try {
      await api.post(
        `/sprint-planner/projects/${activeProject._id}/tasks/${task._id}/timelogs`,
        { hours: 1, remainingHours: nextRemaining },
      );
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, remainingHours: nextRemaining } : t)),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to log time.");
    }
  };

  const onDragStart = (e, task) => {
    if (!canEditTask(task)) return;
    e.dataTransfer.setData("text/plain", task._id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropOnCard = (e, pbiId, targetStatus, targetTaskId) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== targetTaskId) moveTask(draggedId, pbiId, targetStatus, targetTaskId);
  };

  const onDropOnColumn = (e, pbiId, targetStatus) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId) moveTask(draggedId, pbiId, targetStatus, null);
  };

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[var(--text)] opacity-60">
        Select or create a project to see its sprint board.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <SprintPublishBar
        sprints={sprints}
        activeSprintId={activeSprintId}
        setActiveSprintId={setActiveSprintId}
        activeSprint={sprint}
        canManage={canManageActiveProject}
        onChanged={async () => {
          await loadSprints();
          await loadBoard();
        }}
      />

      <div className="flex-1 overflow-auto p-6">
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {canManageActiveProject && sprint && !sprint.published && (() => {
          const unassignedCount = tasks.filter((t) => !t.assigneeId).length;
          return unassignedCount > 0 ? (
            <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-[var(--radius-sm)] px-3 py-2 mb-3">
              {unassignedCount} task{unassignedCount === 1 ? " is" : "s are"} still unassigned in this
              draft sprint — assign them before publishing so nothing gets missed.
            </p>
          ) : null;
        })()}

        {loading ? (
          <p className="text-xs text-[var(--text)] opacity-60">Loading sprint board…</p>
        ) : !sprint ? (
          <p className="text-xs text-[var(--text)] opacity-60">
            No sprint selected yet. {canManageActiveProject && "Create one above."}
          </p>
        ) : pbis.length === 0 ? (
          <p className="text-xs text-[var(--text)] opacity-60">
            Nothing in this sprint yet — drag backlog items into it from the Product Backlog view.
          </p>
        ) : (
          <div className="flex flex-col gap-6 min-w-[900px]">
            {pbis
              .filter((pbi) => canManageActiveProject || tasks.some((t) => t.pbiId === pbi._id))
              .map((pbi) => (
                <div key={pbi._id} className="border border-[var(--color-border)] rounded-[var(--radius-md)] p-4 bg-[var(--color-card)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[var(--text-h)]">{pbi.title}</h3>
                    <div className="flex items-center gap-1.5">
                      {pbi.storyPoints != null && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-[var(--color-muted)] text-[var(--text-h)]">
                          {pbi.storyPoints} pts
                        </span>
                      )}
                      {canManageActiveProject && (
                        <button
                          onClick={() => setNewTaskFor(pbi)}
                          className="flex items-center gap-1 text-[10px] font-medium text-[var(--text)] hover:text-[var(--text-h)] border border-dashed border-[var(--color-border)] rounded px-1.5 py-1 hover:bg-[var(--color-muted)] cursor-pointer"
                        >
                          <Plus size={11} /> Task
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {STATUS_COLUMNS.map((col) => (
                      <div
                        key={col.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDropOnColumn(e, pbi._id, col.id)}
                        className="flex flex-col gap-2 min-h-[60px]"
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text)] opacity-60">
                          {col.label}
                        </span>
                        {tasksFor(pbi._id, col.id).map((task) => {
                          const editable = canEditTask(task);
                          return (
                            <div
                              key={task._id}
                              draggable={editable}
                              onDragStart={(e) => onDragStart(e, task)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => onDropOnCard(e, pbi._id, col.id, task._id)}
                              onClick={() => setOpenTask({ task, pbi })}
                              className={`bg-[var(--color-background)] border border-[var(--color-border)] rounded-[var(--radius-sm)] p-2.5 text-xs hover:border-[var(--color-primary)] transition-colors ${editable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                            >
                              <p className="font-semibold text-[var(--text-h)] line-clamp-2 mb-1">
                                {task.title}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-[var(--text)] opacity-70 truncate">
                                  {task.assigneeId?.name || "Unassigned"}
                                </span>
                                {task.remainingHours != null && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      quickLogHour(task);
                                    }}
                                    disabled={!editable || task.remainingHours <= 0}
                                    title="Log 1 hour"
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-[var(--color-muted)] text-[var(--text-h)] hover:bg-[var(--color-secondary)] disabled:opacity-40 cursor-pointer flex-shrink-0"
                                  >
                                    {task.remainingHours}h left
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {inheritedSprints.length > 0 && (
          <div className="flex flex-col gap-2 mt-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)] opacity-70">
              Shared from parent projects
            </p>
            <div className="flex flex-wrap gap-3">
              {inheritedSprints.map((s) => (
                <div
                  key={s._id}
                  className="bg-[var(--color-muted)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-xs"
                  title="Read-only — managed from its owning project"
                >
                  <p className="font-semibold text-[var(--text-h)]">{s.name}</p>
                  <p className="text-[10px] text-[var(--text)] opacity-70">
                    {s.taskCount} task{s.taskCount === 1 ? "" : "s"} · from {s.sourceProjectName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {openTask && (
        <TaskEditModal
          task={openTask.task}
          pbi={openTask.pbi}
          projectMembers={members}
          canManage={canManageActiveProject}
          onClose={() => setOpenTask(null)}
          onSaved={() => {
            setOpenTask(null);
            loadBoard();
          }}
        />
      )}

      {newTaskFor && (
        <NewTaskModal
          pbi={newTaskFor}
          sprintId={activeSprintId}
          projectMembers={members}
          onClose={() => setNewTaskFor(null)}
          onCreated={() => {
            setNewTaskFor(null);
            loadBoard();
          }}
        />
      )}
    </div>
  );
}
