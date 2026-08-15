import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import api from "../api/axios";
import { SprintPlannerProvider, useSprintPlanner } from "../context/SprintPlannerContext.jsx";
import ProjectSwitcher from "../components/sprintPlanner/ProjectSwitcher.jsx";
import ProjectSettingsDrawer from "../components/sprintPlanner/ProjectSettingsDrawer.jsx";
import HelpTip from "../components/sprintPlanner/HelpTip.jsx";
import GoogleCalendarConnect from "../components/GoogleCalendarConnect.jsx";

const TABS = [
  { id: "backlog", label: "Product Backlog", path: "backlog" },
  { id: "board", label: "Sprint Board", path: "board" },
  { id: "burndown", label: "Burndown", path: "burndown" },
  { id: "release", label: "Release Planning", path: "release" },
  { id: "stats", label: "Stats", path: "stats" },
];

function SprintPlannerShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeProject, canManageActiveProject, error } = useSprintPlanner();
  const [showSettings, setShowSettings] = useState(false);
  const [memberCount, setMemberCount] = useState(null);

  const activeTab = TABS.find((t) => location.pathname.endsWith(`/${t.path}`))?.id || "backlog";

  useEffect(() => {
    if (!activeProject || !canManageActiveProject) {
      setMemberCount(null);
      return;
    }
    api
      .get(`/sprint-planner/projects/${activeProject._id}/members`)
      .then((res) => setMemberCount((res.data.members || []).length))
      .catch(() => setMemberCount(null));
  }, [activeProject?._id, canManageActiveProject, showSettings]);

  return (
    <div className="flex-1 w-full bg-[var(--background)] flex flex-col overflow-hidden">
      <div className="px-6 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="!mb-0 text-2xl font-bold tracking-tight text-[var(--text-h)]">
              Sprint Planner
            </h2>
            <p className="text-xs text-[var(--text)] mt-0.5">
              Product backlogs, sprint boards, and task assignments for {activeProject?.name || "your team"}.
            </p>
          </div>
          <HelpTip title="How this works">
            Admins create Product Backlog Items, pull them into a Sprint, break them into Tasks,
            and assign teammates. Nothing is visible to an assigned employee until you hit
            "Publish Sprint" — from then on they only see their own tasks and can log time or
            request a hand-off from a teammate.
          </HelpTip>
        </div>
        <div className="flex items-center gap-3">
          <ProjectSwitcher />
          {activeProject && (
            <button
              onClick={() => setShowSettings(true)}
              title="Project members & settings"
              className="p-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--text)] hover:text-[var(--text-h)] hover:bg-[var(--color-muted)] cursor-pointer"
            >
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 px-6 pt-3">{error}</p>}

      {memberCount === 0 && (
        <div className="mx-6 mt-3 bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs rounded-[var(--radius-sm)] px-3 py-2 flex items-center justify-between gap-3">
          <span>No team members are assigned to this project yet — tasks can't be published to anyone.</span>
          <button
            onClick={() => setShowSettings(true)}
            className="font-semibold underline whitespace-nowrap cursor-pointer"
          >
            Add members
          </button>
        </div>
      )}

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

      {showSettings && activeProject && (
        <ProjectSettingsDrawer onClose={() => setShowSettings(false)} />
      )}
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
