import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { AuthContext } from "./AuthContext.jsx";
import { roleCan } from "../utils/permissions.js";

export const SprintPlannerContext = createContext(null);

const OVERSEER_ROLES = ["superadmin", "admin", "sprint_planner"];

const activeSprintKey = (userId) => `reslv_sp_active_sprint_${userId}`;

// Local to the Sprint Planner module — holds the sprint list + which sprint
// the overseer (admin/sprint_planner) is currently working in, persisted
// per-user the same way AuthContext persists activeRole. Mounted once in
// SprintPlannerPage.jsx so every child view (board, stats, performance) shares
// one sprint context instead of each screen fetching/tracking it separately.
// Plain employees don't use this at all — they go straight to MyTasksView.
export function SprintPlannerProvider({ children }) {
  const { user, activeRole } = useContext(AuthContext);
  const isOverseer = roleCan(activeRole, user?.roles, OVERSEER_ROLES);

  const [sprints, setSprints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [activeSprintId, setActiveSprintIdState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshSprints = useCallback(async () => {
    if (!isOverseer) {
      setSprints([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/sprint-planner/sprints");
      setSprints(res.data.sprints || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [isOverseer]);

  const refreshSegments = useCallback(async () => {
    if (!isOverseer) {
      setSegments([]);
      return;
    }
    try {
      const res = await api.get("/segments");
      setSegments(res.data.segments || []);
    } catch {
      // Non-critical — task modals just fall back to an unfiltered assignee list.
    }
  }, [isOverseer]);

  useEffect(() => {
    refreshSprints();
    refreshSegments();
  }, [refreshSprints, refreshSegments]);

  useEffect(() => {
    if (!user?.id || sprints.length === 0) return;
    const stored = localStorage.getItem(activeSprintKey(user.id));
    const match = sprints.find((s) => s._id === stored);
    setActiveSprintIdState((current) => {
      if (current && sprints.some((s) => s._id === current)) return current;
      return (match || sprints[0])._id;
    });
  }, [user?.id, sprints]);

  const setActiveSprintId = (id) => {
    setActiveSprintIdState(id);
    if (user?.id) localStorage.setItem(activeSprintKey(user.id), id);
  };

  const activeSprint = sprints.find((s) => s._id === activeSprintId) || null;

  return (
    <SprintPlannerContext.Provider
      value={{
        sprints,
        segments,
        activeSprintId,
        activeSprint,
        setActiveSprintId,
        isOverseer,
        loading,
        error,
        refreshSprints,
        refreshSegments,
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
