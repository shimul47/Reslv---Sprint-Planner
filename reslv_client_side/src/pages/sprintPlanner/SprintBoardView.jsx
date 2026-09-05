import { useCallback, useEffect, useState } from "react";
import { Circle, Clock, CheckCircle2, Plus, Lock } from "lucide-react";
import api from "../../api/axios";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";
import SprintPublishBar from "../../components/sprintPlanner/SprintPublishBar.jsx";
import TaskEditModal from "../../components/sprintPlanner/TaskEditModal.jsx";
import NewTaskModal from "../../components/sprintPlanner/NewTaskModal.jsx";
import TaskCompleteModal from "../../components/sprintPlanner/TaskCompleteModal.jsx";

const TASK_TYPE_LABELS = {
  new_feature: "New",
  bug: "Bug",
  improvement: "Improvement",
  chore: "Chore",
};

// Card color + icon per status — the sticky-note board this replaced used
// one fixed color per column regardless of app theme (real sticky notes
// don't change color in the dark), so these stay as literal hex values
// rather than theme tokens.
const STATUS_COLUMNS = [
  { id: "todo", label: "To Do", color: "#FFD591", Icon: Circle },
  { id: "in_progress", label: "In Progress", color: "#78D3F8", Icon: Clock },
  { id: "done", label: "Done", color: "#85E3B2", Icon: CheckCircle2 },
];

// The board is organized as one swimlane per company segment/team, plus a
// standing "Unassigned" lane for tasks that aren't tied to a team — every
// task and every "+ Task" button lives inside a specific lane, and the
// assignee picker for a lane only ever shows that lane's people.
const UNASSIGNED_LANE = { _id: null, name: "Unassigned" };

export default function SprintBoardView() {
  const { sprints, segments, activeSprintId, setActiveSprintId, refreshSprints } = useSprintPlanner();
  const lanes = [...segments, UNASSIGNED_LANE];

  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTask, setOpenTask] = useState(null);
  const [creatingTaskLane, setCreatingTaskLane] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);

  const loadBoard = useCallback(async () => {
    if (!activeSprintId) {
      setSprint(null);
      setTasks([]);
      setEmployees([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [boardRes, capacityRes] = await Promise.all([
        api.get(`/sprint-planner/sprints/${activeSprintId}/board`),
        api.get(`/sprint-planner/sprints/${activeSprintId}/capacity`),
      ]);
      setSprint(boardRes.data.sprint);
      setTasks(boardRes.data.tasks || []);
      setEmployees(capacityRes.data.employees || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load the sprint board.");
    } finally {
      setLoading(false);
    }
  }, [activeSprintId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Drag-and-drop only ever reorders/changes status within the task's own
  // lane — dropping onto a different team's swimlane is a no-op rather than
  // silently reassigning its team (that's a deliberate edit, done via the
  // task modal instead).
  const moveTask = async (draggedId, laneId, targetStatus, beforeTaskId) => {
    if (targetStatus === "done") return; // handled via TaskCompleteModal instead
    const dragged = tasks.find((t) => t._id === draggedId);
    if (!dragged || dragged.status === "done") return;
    if ((dragged.segmentId || null) !== laneId) return;

    const withoutDragged = tasks.filter((t) => t._id !== draggedId);
    const targetList = withoutDragged
      .filter((t) => t.status === targetStatus && (t.segmentId || null) === laneId)
      .sort((a, b) => a.position - b.position);

    const insertAt = beforeTaskId ? targetList.findIndex((t) => t._id === beforeTaskId) : targetList.length;
    targetList.splice(insertAt === -1 ? targetList.length : insertAt, 0, {
      ...dragged,
      status: targetStatus,
    });

    const updates = targetList.map((t, index) => ({ ...t, position: index }));
    const others = withoutDragged.filter(
      (t) => !(t.status === targetStatus && (t.segmentId || null) === laneId),
    );
    setTasks([...others, ...updates]);

    const changed = updates.filter((t) => {
      const original = tasks.find((o) => o._id === t._id);
      return !original || original.position !== t.position || original.status !== targetStatus;
    });

    try {
      await Promise.all(
        changed.map((t) =>
          api.patch(`/sprint-planner/tasks/${t._id}`, {
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

  const onDragStart = (e, task) => {
    if (task.status === "done") return;
    e.dataTransfer.setData("text/plain", task._id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropOnCard = (e, laneId, targetStatus, targetTaskId) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetTaskId) return;
    if (targetStatus === "done") {
      const dragged = tasks.find((t) => t._id === draggedId);
      if (dragged) setCompletingTask(dragged);
      return;
    }
    moveTask(draggedId, laneId, targetStatus, targetTaskId);
  };

  const onDropOnColumn = (e, laneId, targetStatus) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId) return;
    if (targetStatus === "done") {
      const dragged = tasks.find((t) => t._id === draggedId);
      if (dragged) setCompletingTask(dragged);
      return;
    }
    moveTask(draggedId, laneId, targetStatus, null);
  };

  // a task is blocked while any of its dependencies isn't done yet
  const isBlocked = (task) => (task.dependsOn || []).some((d) => d.status !== "done");

  const tasksForLaneStatus = (laneId, status) =>
    tasks
      .filter((t) => (t.segmentId || null) === laneId && t.status === status)
      .sort((a, b) => a.position - b.position);

  const missingAssigneeCount = tasks.filter((t) => !t.assigneeId).length;

  return (
    <div className="w-full h-full flex flex-col">
      <SprintPublishBar
        sprints={sprints}
        activeSprintId={activeSprintId}
        setActiveSprintId={setActiveSprintId}
        activeSprint={sprint}
        onChanged={async () => {
          await refreshSprints();
          await loadBoard();
        }}
      />

      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {segments.length === 0 && (
          <p className="text-xs text-[var(--text)] opacity-60 bg-[var(--color-muted)] rounded-[var(--radius-sm)] px-3 py-2 mb-3">
            No teams set up yet — add segments (Web Team, QA Team, …) in Admin → Team Management to
            organize the board by team. Tasks created here go into "Unassigned" until then.
          </p>
        )}

        {sprint && !sprint.published && missingAssigneeCount > 0 && (
          <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-[var(--radius-sm)] px-3 py-2 mb-3">
            {missingAssigneeCount} task{missingAssigneeCount === 1 ? " is" : "s are"} still missing an
            assignee in this draft sprint — assign them before publishing so nothing gets missed.
          </p>
        )}

        {loading ? (
          <BoardSkeleton laneCount={Math.max(lanes.length, 1)} />
        ) : !sprint ? (
          <p className="text-xs text-[var(--text)] opacity-60">
            No sprint selected yet. Create one above.
          </p>
        ) : (
          <div className="flex flex-col gap-8 min-w-[900px]">
            {lanes.map((lane) => {
              const laneId = lane._id || null;
              const laneTaskCount = tasks.filter((t) => (t.segmentId || null) === laneId).length;
              return (
                <div key={laneId || "unassigned"} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-base font-bold tracking-tight text-[var(--text-h)]">
                        {lane.name}
                      </h3>
                      <span className="text-[11px] text-[var(--text)] opacity-60">
                        {laneTaskCount} task{laneTaskCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <button
                      onClick={() => setCreatingTaskLane(lane)}
                      className="flex items-center gap-1 text-[11px] font-medium text-[var(--text)] hover:text-[var(--text-h)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1 hover:bg-[var(--color-muted)] cursor-pointer"
                    >
                      <Plus size={12} /> Task
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {STATUS_COLUMNS.map((col) => (
                      <div
                        key={col.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDropOnColumn(e, laneId, col.id)}
                        className="flex flex-col gap-3 min-h-[100px]"
                      >
                        <div className="flex items-center gap-1.5">
                          <col.Icon size={15} style={{ color: col.color }} />
                          <h4 className="text-xs font-bold tracking-tight text-[var(--text-h)] opacity-80">
                            {col.label}
                          </h4>
                        </div>

                        {tasksForLaneStatus(laneId, col.id).map((task) => {
                          const draggable = task.status !== "done";
                          return (
                            <div
                              key={task._id}
                              draggable={draggable}
                              onDragStart={(e) => onDragStart(e, task)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => onDropOnCard(e, laneId, col.id, task._id)}
                              onClick={() => setOpenTask(task)}
                              style={{ backgroundColor: col.color }}
                              className={`relative rounded-tl-sm rounded-tr-sm p-3 text-neutral-900 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_6px_10px_rgba(0,0,0,0.04)] transition-all hover:scale-[1.01] duration-150 before:content-[''] before:absolute before:left-0 before:right-0 before:bottom-0 before:h-2 before:bg-inherit before:rounded-bl-[40%_12px] before:rounded-br-[40%_12px] before:shadow-[0_4px_5px_rgba(0,0,0,0.15)] before:translate-y-[2px] ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                            >
                              <p className="font-semibold text-sm line-clamp-2 mb-1.5 relative z-10">
                                {task.title}
                              </p>
                              <div className="flex items-center gap-1.5 mb-2 relative z-10 flex-wrap">
                                <span className="text-[9px] font-bold bg-black/15 px-1.5 py-0.5 rounded-xs uppercase">
                                  {TASK_TYPE_LABELS[task.taskType] || task.taskType}
                                </span>
                                {col.id !== "done" && isBlocked(task) && (
                                  <span
                                    title="Waiting on another task to finish first"
                                    className="flex items-center gap-0.5 text-[9px] font-bold bg-black/15 px-1.5 py-0.5 rounded-xs"
                                  >
                                    <Lock size={9} /> Blocked
                                  </span>
                                )}
                                <span className="text-[9px] font-bold bg-black/15 px-1.5 py-0.5 rounded-xs">
                                  {task.status === "done" && task.actualHours != null
                                    ? `${task.actualHours}h actual`
                                    : `${task.approximateHours}h approx`}
                                </span>
                              </div>
                              <div className="flex items-center justify-between relative z-10">
                                <span className="text-[9px] font-bold bg-black/15 text-neutral-800 px-1.5 py-0.5 rounded-xs uppercase truncate max-w-[60%]">
                                  {task.assigneeId?.name || "Unassigned"}
                                </span>
                                {col.id !== "done" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCompletingTask(task);
                                    }}
                                    title="Mark done"
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-black/15 text-neutral-800 hover:bg-black/25 cursor-pointer flex-shrink-0"
                                  >
                                    Done
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {tasksForLaneStatus(laneId, col.id).length === 0 && (
                          <div className="border border-dashed border-[var(--color-ring)] opacity-40 rounded-sm h-12 flex items-center justify-center text-[11px] text-[var(--text)]">
                            + Open Slot
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {openTask && (
        <TaskEditModal
          task={openTask}
          employees={employees}
          segments={segments}
          allTasks={tasks}
          onClose={() => setOpenTask(null)}
          onSaved={() => {
            setOpenTask(null);
            loadBoard();
          }}
          onDeleted={() => {
            setOpenTask(null);
            loadBoard();
          }}
        />
      )}

      {creatingTaskLane && sprint && (
        <NewTaskModal
          sprintId={sprint._id}
          employees={employees}
          segmentId={creatingTaskLane._id || null}
          segmentName={creatingTaskLane._id ? creatingTaskLane.name : null}
          onClose={() => setCreatingTaskLane(null)}
          onCreated={() => {
            setCreatingTaskLane(null);
            loadBoard();
          }}
        />
      )}

      {completingTask && (
        <TaskCompleteModal
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onCompleted={() => {
            setCompletingTask(null);
            loadBoard();
          }}
        />
      )}
    </div>
  );
}

// Mirrors the real swimlane/column layout while the board is still
// loading, so the page doesn't jump/reflow once data arrives — laneCount
// tracks the actual segment count (+ Unassigned) so returning admins see a
// skeleton the same shape as what's about to load in.
function BoardSkeleton({ laneCount }) {
  return (
    <div className="flex flex-col gap-8 min-w-[900px] animate-pulse">
      {Array.from({ length: laneCount }).map((_, laneIndex) => (
        <div key={laneIndex} className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
            <div className="h-4 w-28 rounded bg-[var(--color-muted)]" />
            <div className="h-6 w-16 rounded bg-[var(--color-muted)]" />
          </div>
          <div className="grid grid-cols-3 gap-6">
            {STATUS_COLUMNS.map((col) => (
              <div key={col.id} className="flex flex-col gap-3">
                <div className="h-3.5 w-16 rounded bg-[var(--color-muted)]" />
                <div className="h-20 rounded-[var(--radius-sm)] bg-[var(--color-muted)]" />
                <div className="h-20 rounded-[var(--radius-sm)] bg-[var(--color-muted)]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
