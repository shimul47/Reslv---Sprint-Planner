import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SprintPlannerProvider, useSprintPlanner } from "../context/SprintPlannerContext.jsx";
import HelpTip from "../components/sprintPlanner/HelpTip.jsx";
import GoogleCalendarConnect from "../components/GoogleCalendarConnect.jsx";
import MyTasksView from "./sprintPlanner/MyTasksView.jsx";

const TABS = [
  { id: "board", label: "Sprint Board", path: "board" },
  { id: "stats", label: "Stats", path: "stats" },
  { id: "performance", label: "Performance", path: "performance" },
  { id: "availability", label: "Availability", path: "availability" },
];

function SprintPlannerShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOverseer, error } = useSprintPlanner();

  const activeTab = TABS.find((t) => location.pathname.endsWith(`/${t.path}`))?.id || "board";

  // Overseers land on the tabbed shell (Board by default); a plain employee
  // hitting the bare index — or any overseer-only tab — goes straight to
  // their own task list instead.
  useEffect(() => {
    if (!isOverseer) return;
    const onKnownTab = TABS.some((t) => location.pathname.endsWith(`/${t.path}`));
    if (!onKnownTab) navigate("board", { replace: true });
  }, [isOverseer, location.pathname, navigate]);

  if (!isOverseer) {
    return (
      <div className="flex-1 w-full bg-[var(--background)] flex flex-col overflow-hidden">
        <div className="px-6 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-[var(--color-border)]">
          <div>
            <h2 className="!mb-0 text-2xl font-bold tracking-tight text-[var(--text-h)]">
              My Tasks
            </h2>
            <p className="text-xs text-[var(--text)] mt-0.5">
              Tasks assigned to you in published sprints.
            </p>
          </div>
          <HelpTip title="How this works">
            When a sprint planner publishes a sprint, tasks assigned to you show up here. Click
            "Attempt" to start one, then "Mark Done" and enter the hours it actually took. You can
            also divert a task to a teammate if someone else should take it.
          </HelpTip>
        </div>
        <div className="px-6 pt-3">
          <GoogleCalendarConnect />
        </div>
        <div className="flex-1 overflow-y-auto">
          <MyTasksView />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[var(--background)] flex flex-col overflow-hidden">
      <div className="px-6 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="!mb-0 text-2xl font-bold tracking-tight text-[var(--text-h)]">
              Sprint Planner
            </h2>
            <p className="text-xs text-[var(--text)] mt-0.5">
              Create sprints, assign tasks against each teammate's remaining hours, and publish.
            </p>
          </div>
          <HelpTip title="How this works">
            Create a sprint, add tasks with an approximate-hour estimate, and assign each one to a
            teammate — the assignee picker shows how many hours they have left in this sprint.
            Nothing is visible to an assigned employee until you hit "Publish Sprint" — from then
            on they only see their own tasks and can attempt, complete, or divert them.
          </HelpTip>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 px-6 pt-3">{error}</p>}

      <div className="px-6 pt-3">
        <GoogleCalendarConnect />
      </div>

      <div className="px-6 pt-3 flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`text-xs font-semibold px-3 py-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[var(--color-primary)] text-[var(--text-h)]"
                : "border-transparent text-[var(--text)] opacity-70 hover:opacity-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

export default function SprintPlannerPage() {
  return (
    <SprintPlannerProvider>
      <SprintPlannerShell />
    </SprintPlannerProvider>
  );
}
