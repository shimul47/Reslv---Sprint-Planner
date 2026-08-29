import { useCallback, useContext, useEffect, useState } from "react";
import { RefreshCw, Circle, Clock, CheckCircle2, Lock } from "lucide-react";
import api from "../../api/axios";
import { AuthContext } from "../../context/AuthContext.jsx";
import TaskCompleteModal from "../../components/sprintPlanner/TaskCompleteModal.jsx";
import TaskRequestModal from "../../components/sprintPlanner/TaskRequestModal.jsx";

const TASK_TYPE_LABELS = {
  new_feature: "New",
  bug: "Bug",
  improvement: "Improvement",
  chore: "Chore",
};

// Same status colors/icons as the admin Sprint Board, so the two views read
// as one system. Grouping into columns (rather than one flat list) is the
// point — it puts "what's still to do" and "what's already done" in
// visually separate places instead of mixed together by sprint alone.
const STATUS_COLUMNS = [
  { id: "todo", label: "To Do", color: "#FFD591", Icon: Circle },
  { id: "in_progress", label: "In Progress", color: "#78D3F8", Icon: Clock },
  { id: "done", label: "Done", color: "#85E3B2", Icon: CheckCircle2 },
];

export default function MyTasksView() {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completingTask, setCompletingTask] = useState(null);
  const [divertingTask, setDivertingTask] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [tasksRes, requestsRes] = await Promise.all([
        api.get("/sprint-planner/tasks/my"),
        api.get("/sprint-planner/task-requests"),
      ]);
      setTasks(tasksRes.data.tasks || []);
      setRequests(requestsRes.data.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load your tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  const handleAttempt = async (task) => {
    try {
      await api.post(`/sprint-planner/tasks/${task._id}/attempt`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start task.");
    }
  };

  const resolveRequest = async (requestId, action) => {
    try {
      await api.patch(`/sprint-planner/task-requests/${requestId}`, { action });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update request.");
    }
  };

  // a task is blocked while any of its dependencies isn't done yet
  const isBlocked = (task) => (task.dependsOn || []).some((d) => d.status !== "done");

  const incoming = requests.filter(
    (r) => String(r.toUserId?._id || r.toUserId) === String(user?.id) && r.status === "pending",
  );

  const tasksBySprint = new Map();
  for (const task of tasks) {
    const key = task.sprint?._id || "unknown";
    if (!tasksBySprint.has(key)) tasksBySprint.set(key, { sprint: task.sprint, tasks: [] });
    tasksBySprint.get(key).tasks.push(task);
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text)] hover:text-[var(--text-h)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 hover:bg-[var(--color-muted)] cursor-pointer"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {incoming.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 flex flex-col gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)] opacity-70">
            Incoming task requests
          </p>
          {incoming.map((r) => (
            <div key={r._id} className="flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-semibold text-[var(--text-h)]">{r.fromUserId?.name}</span>{" "}
                wants to hand off "{r.taskId?.title}"
                {r.hoursSpent > 0 && (
                  <span className="opacity-70"> ({r.hoursSpent}h already logged by them)</span>
                )}
                {r.message && <p className="text-[11px] opacity-70 mt-0.5">"{r.message}"</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => resolveRequest(r._id, "accept")}
                  className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer hover:opacity-90"
                >
                  Accept
                </button>
                <button
                  onClick={() => resolveRequest(r._id, "decline")}
                  className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-[10px] font-semibold px-2.5 py-1 rounded cursor-pointer hover:bg-[var(--color-secondary)]"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <MyTasksSkeleton />
      ) : tasks.length === 0 ? (
        <p className="text-xs text-[var(--text)] opacity-60">
          No tasks assigned to you yet in any published sprint.
        </p>
      ) : (
        [...tasksBySprint.values()].map(({ sprint, tasks: sprintTasks }) => (
          <div key={sprint?._id || "unknown"} className="flex flex-col gap-3">
            <p className="text-sm font-bold text-[var(--text-h)]">{sprint?.name || "Sprint"}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STATUS_COLUMNS.map((col) => {
                const colTasks = sprintTasks.filter((t) => t.status === col.id);
                return (
                  <div key={col.id} className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5">
                      <col.Icon size={15} style={{ color: col.color }} />
                      <h4 className="text-xs font-bold tracking-tight text-[var(--text-h)] opacity-80">
                        {col.label}
                      </h4>
                      <span className="text-[10px] text-[var(--text)] opacity-60">
                        {colTasks.length}
                      </span>
                    </div>

                    {colTasks.map((task) => (
                      <div
                        key={task._id}
                        style={{ backgroundColor: col.color }}
                        className="relative rounded-tl-sm rounded-tr-sm p-3 text-neutral-900 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_6px_10px_rgba(0,0,0,0.04)] before:content-[''] before:absolute before:left-0 before:right-0 before:bottom-0 before:h-2 before:bg-inherit before:rounded-bl-[40%_12px] before:rounded-br-[40%_12px] before:shadow-[0_4px_5px_rgba(0,0,0,0.15)] before:translate-y-[2px]"
                      >
                        <p className="font-semibold text-sm mb-1.5 relative z-10">{task.title}</p>
                        {task.sourceTicketId?.ticketNumber && (
                          <p className="text-[10px] font-bold opacity-60 mb-1.5 relative z-10">
                            From ticket #{task.sourceTicketId.ticketNumber}
                          </p>
                        )}
                        {task.description && (
                          <p className="text-[11px] opacity-70 mb-2 relative z-10 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mb-3 relative z-10">
                          <span className="text-[9px] font-bold bg-black/15 px-1.5 py-0.5 rounded-xs uppercase">
                            {TASK_TYPE_LABELS[task.taskType] || task.taskType}
                          </span>
                          <span className="text-[9px] font-bold bg-black/15 px-1.5 py-0.5 rounded-xs">
                            {task.status === "done" && task.actualHours != null
                              ? `${task.actualHours}h actual`
                              : `${task.approximateHours}h approx`}
                          </span>
                          {task.status === "todo" && isBlocked(task) && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold bg-black/15 px-1.5 py-0.5 rounded-xs">
                              <Lock size={9} /> Blocked
                            </span>
                          )}
                        </div>

                        {task.status === "todo" && isBlocked(task) && (
                          <p className="text-[10px] opacity-70 mb-2 relative z-10">
                            Waiting on: {task.dependsOn.filter((d) => d.status !== "done").map((d) => d.title).join(", ")}
                          </p>
                        )}

                        <div className="flex items-center gap-2 relative z-10">
                          {task.status === "todo" && (
                            <>
                              <button
                                onClick={() => handleAttempt(task)}
                                disabled={isBlocked(task)}
                                title={isBlocked(task) ? "Finish its dependencies first" : undefined}
                                className="bg-black/15 hover:bg-black/25 text-[10px] font-bold px-2 py-1 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black/15"
                              >
                                Attempt
                              </button>
                              <button
                                onClick={() => setDivertingTask(task)}
                                className="text-[10px] font-medium underline opacity-70 hover:opacity-100 cursor-pointer"
                              >
                                Divert
                              </button>
                            </>
                          )}
                          {task.status === "in_progress" && (
                            <>
                              <button
                                onClick={() => setCompletingTask(task)}
                                className="bg-black/15 hover:bg-black/25 text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                              >
                                Mark Done
                              </button>
                              <button
                                onClick={() => setDivertingTask(task)}
                                className="text-[10px] font-medium underline opacity-70 hover:opacity-100 cursor-pointer"
                              >
                                Divert
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <div className="border border-dashed border-[var(--color-ring)] opacity-40 rounded-sm h-12 flex items-center justify-center text-[11px] text-[var(--text)]">
                        Nothing here
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {completingTask && (
        <TaskCompleteModal
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onCompleted={() => {
            setCompletingTask(null);
            load();
          }}
        />
      )}

      {divertingTask && (
        <TaskRequestModal
          task={divertingTask}
          currentUserId={user?.id}
          onClose={() => setDivertingTask(null)}
          onSent={() => {
            setDivertingTask(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// Mirrors the real 3-column layout while tasks are still loading, so the
// page doesn't jump/reflow once data arrives.
function MyTasksSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-4 w-32 rounded bg-[var(--color-muted)]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUS_COLUMNS.map((col) => (
          <div key={col.id} className="flex flex-col gap-3">
            <div className="h-4 w-20 rounded bg-[var(--color-muted)]" />
            <div className="h-24 rounded-[var(--radius-sm)] bg-[var(--color-muted)]" />
            <div className="h-24 rounded-[var(--radius-sm)] bg-[var(--color-muted)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
