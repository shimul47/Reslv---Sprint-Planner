import React, { useContext } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

import AppShell from "./pages/AppShell";
import LoginScreen from "./pages/LoginScreen";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import { InboxView, EscalationsView } from "./components/workspace/Views";
import { ReportsView, SettingsView } from "./components/workspace/Placeholders";
import SprintPlannerPage from "./pages/SprintPlannerPage";
import TeamManagement from "./pages/TeamManagement";

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
      return (
        <Navigate
          to={user.roles?.includes("superadmin") ? "/admin" : "/dashboard"}
          replace
        />
      );
    }
  }

  return children;
}

export default function App() {
  const { user, logout } = useContext(AuthContext);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to={user.roles?.includes("superadmin") ? "/admin" : "/dashboard"}
              replace
            />
          ) : (
            <LoginScreen />
          )
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth allowedRoles={["superadmin"]}>
            <div className="relative">
              <button
                onClick={logout}
                className="absolute top-9 right-8 z-50 bg-red-950 text-red-400 border border-red-800 text-[10px] font-mono px-3 py-1 rounded hover:bg-red-900 hover:text-white transition-all cursor-pointer"
              >
                DISCONNECT_SESSION
              </button>
              <SuperAdminDashboard />
            </div>
          </RequireAuth>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth
            allowedRoles={["superadmin", "admin", "agent", "sprint_planner"]}
          >
            <AppShell user={user} onLogout={logout} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={null} />
        <Route path="tickets/inbox" element={<InboxView />} />
        <Route path="tickets/escalations" element={<EscalationsView />} />
        <Route path="tickets/reports" element={<ReportsView />} />
        <Route path="tickets/settings" element={<SettingsView />} />
        <Route path="sprint-planner" element={<SprintPlannerPage />} />
        <Route path="admin/team" element={<TeamManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
