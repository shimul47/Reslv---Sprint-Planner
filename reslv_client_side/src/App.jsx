import React, { useContext, useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

import AppShell from "./pages/AppShell";
import LoginScreen from "./pages/LoginScreen";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import {
  InboxView,
  EscalationsView,
  ResolvedView,
} from "./components/workspace/Views";
import { ReportsView } from "./components/workspace/Reports";
import { SettingsView } from "./components/workspace/Settings";
import SprintPlannerPage from "./pages/SprintPlannerPage";
import SprintBoardView from "./pages/sprintPlanner/SprintBoardView";
import ScrumStatsView from "./pages/sprintPlanner/ScrumStatsView";
import PerformanceAnalyticsView from "./pages/sprintPlanner/PerformanceAnalyticsView";
import TeamManagement from "./pages/TeamManagement";
import BillingPage from "./pages/BillingPage";
import ProfilePage from "./pages/ProfilePage";
import InviteAcceptPage from "./pages/InviteAcceptPage";
import SupportPortalPage from "./pages/SupportPortalPage";
import TicketsPage from "./pages/TicketsPage";
import { roleLandingPath } from "./utils/roleRouting.js";

function RequireAuth({ allowedRoles, children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-sm">
        LOADING_SESSION...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if the user has at least one of the required roles
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user.roles?.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return <Navigate to={roleLandingPath(user.roles)} replace />;
    }
  }

  return children;
}

// Superadmin is the most privileged view in the app. A person can reach it
// having already been on other authenticated pages (a different role's
// dashboard, tickets, etc.), and the browser's Back button would otherwise
// just reveal whichever of those pages preceded it in history — leaking
// that content to anyone with physical access to the browser afterwards.
// Pushing a guard entry on mount means the first Back press is caught here
// (as a popstate event) instead of falling through to that page, and
// logging out ensures Forward/repeated Back can't silently restore access.
function BlockBackNavigation({ children }) {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      logout();
      navigate("/login", { replace: true });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate, logout]);

  return children;
}

export default function App() {
  const { user, logout } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/accept-invite" element={<InviteAcceptPage />} />
      <Route path="/support/:companyCode" element={<SupportPortalPage />} />
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={roleLandingPath(user.roles)} replace />
          ) : (
            <LoginScreen />
          )
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth allowedRoles={["superadmin"]}>
            <BlockBackNavigation>
              <div className="relative">
                <button
                  onClick={logout}
                  className="absolute top-9 right-8 z-50 bg-red-950 text-red-400 border border-red-800 text-[10px] font-mono px-3 py-1 rounded hover:bg-red-900 hover:text-white transition-all cursor-pointer"
                >
                  DISCONNECT_SESSION
                </button>
                <SuperAdminDashboard />
              </div>
            </BlockBackNavigation>
          </RequireAuth>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth
            allowedRoles={[
              "superadmin",
              "admin",
              "agent",
              "employee",
              "sprint_planner",
            ]}
          >
            <AppShell user={user} onLogout={logout} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={null} />
        <Route path="tickets" element={<TicketsPage />}>
          <Route index element={<Navigate to="inbox" replace />} />
          <Route path="inbox" element={<InboxView />} />
          <Route path="escalations" element={<EscalationsView />} />
          <Route path="resolved" element={<ResolvedView />} />
          <Route
            path="reports"
            element={
              <RequireAuth allowedRoles={["superadmin", "admin"]}>
                <ReportsView />
              </RequireAuth>
            }
          />
          <Route
            path="settings"
            element={
              <RequireAuth allowedRoles={["superadmin", "admin"]}>
                <SettingsView />
              </RequireAuth>
            }
          />
        </Route>
        <Route path="sprint-planner" element={<SprintPlannerPage />}>
          <Route path="board" element={<SprintBoardView />} />
          <Route path="stats" element={<ScrumStatsView />} />
          <Route path="performance" element={<PerformanceAnalyticsView />} />
        </Route>
        <Route path="admin/team" element={<TeamManagement />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="billing/success" element={<BillingPage />} />
        <Route path="billing/cancelled" element={<BillingPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
