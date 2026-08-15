import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { AuthContext } from "./AuthContext.jsx";

export const SprintPlannerContext = createContext(null);

const activeProjectKey = (userId) => `reslv_sp_active_project_${userId}`;

// Local to the Sprint Planner module — holds the project list + which
// project the user is currently working in, persisted per-user the same way
// AuthContext persists activeRole. Mounted once in SprintPlannerPage.jsx so
// every child view (backlog, sprint board, ...) shares one project context
// instead of each screen fetching/tracking it separately.
export function SprintPlannerProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectIdState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/sprint-planner/projects");
      setProjects(res.data.projects || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (!user?.id || projects.length === 0) return;
    const stored = localStorage.getItem(activeProjectKey(user.id));
    const match = projects.find((p) => p._id === stored);
    setActiveProjectIdState((current) => {
      if (current && projects.some((p) => p._id === current)) return current;
      return (match || projects[0])._id;
    });
  }, [user?.id, projects]);

  const setActiveProjectId = (id) => {
    setActiveProjectIdState(id);
    if (user?.id) localStorage.setItem(activeProjectKey(user.id), id);
  };

  const activeProject = projects.find((p) => p._id === activeProjectId) || null;
  const canManageActiveProject =
    activeProject?.myRole === "overseer" || activeProject?.myRole === "manager";

  return (
    <SprintPlannerContext.Provider
      value={{
        projects,
        activeProjectId,
        activeProject,
        canManageActiveProject,
        setActiveProjectId,
        loading,
        error,
        refreshProjects,
      }}
    >
      {children}
    </SprintPlannerContext.Provider>
  );
}

export function useSprintPlanner() {
  const ctx = useContext(SprintPlannerContext);
  if (!ctx) {
    throw new Error("useSprintPlanner must be used within a SprintPlannerProvider");
  }
  return ctx;
}
