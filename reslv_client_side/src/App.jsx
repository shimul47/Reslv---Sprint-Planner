import React, { useContext } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

import AppShell from "./pages/AppShell";
import LoginScreen from "./pages/LoginScreen";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import { InboxView, EscalationsView } from "./components/workspace/Views";
import { ReportsView, SettingsView } from "./components/workspace/Placeholders";
import SprintPlannerPage from "./pages/SprintPlannerPage";

// Upgraded RequireAuth to allow structural workspace routing checks
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
      // Send them to their appropriate workspace view root
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

      {/* SUPERADMIN ROUTE */}
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

      {/* WORKER / TENANT ROUTES - Added "superadmin" so they can visit the tickets system */}
      <Route
        path="/"
        element={
          <RequireAuth
            allowedRoles={["superadmin", "admin", "agent", "sprint_planner"]}
          >
            {/* 👈 Explicitly passing context profile and logout down to your updated shell layout */}
            <AppShell user={user} onLogout={logout} />
          </RequireAuth>
        }
      >
        {/* Redirect root to the dashboard explicitly */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* The AppShell handles rendering the actual dashboard UI for this path */}
        <Route path="dashboard" element={null} />

        {/* Sub-applications passed through the AppShell Outlet */}
        <Route path="tickets/inbox" element={<InboxView />} />
        <Route path="tickets/escalations" element={<EscalationsView />} />
        <Route path="tickets/reports" element={<ReportsView />} />
        <Route path="tickets/settings" element={<SettingsView />} />
        <Route path="sprint-planner" element={<SprintPlannerPage />} />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
