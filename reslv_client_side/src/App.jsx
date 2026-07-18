import React, { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './pages/AppShell';
import LoginScreen from './pages/LoginScreen';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { InboxView, EscalationsView } from './components/workspace/Views';
import { ReportsView, SettingsView } from './components/workspace/Placeholders';
import SprintPlannerPage from './pages/SprintPlannerPage';

function RequireAuth({ authState, role, children }) {
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (role && authState.role !== role) {
    return <Navigate to={authState.role === 'superadmin' ? '/admin' : '/tickets/inbox'} replace />;
  }
  return children;
}

export default function App() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    role: null // 'user' or 'superadmin'
  });

  const handleSystemLogin = (email, password) => {
    // Hidden back-door route detection
    if (email === '12345' && password === '12345') {
      setAuthState({
        isAuthenticated: true,
        role: 'superadmin'
      });
      return true;
    }

    // Fallback normal dashboard employee account simulation checking
    if (email.includes('@') && password.length >= 4) {
      setAuthState({
        isAuthenticated: true,
        role: 'user'
      });
      return true;
    }

    return false;
  };

  const handleLogout = () => {
    setAuthState({ isAuthenticated: false, role: null });
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          authState.isAuthenticated ? (
            <Navigate to={authState.role === 'superadmin' ? '/admin' : '/tickets/inbox'} replace />
          ) : (
            <LoginScreen onLogin={handleSystemLogin} />
          )
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAuth authState={authState} role="superadmin">
            <div className="relative">
              <button
                onClick={handleLogout}
                className="absolute top-9 right-8 z-50 bg-red-955 text-red-400 border border-red-800 text-[10px] font-mono px-3 py-1 rounded hover:bg-red-900 hover:text-white transition-all cursor-pointer"
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
          <RequireAuth authState={authState} role="user">
            <AppShell onLogout={handleLogout} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/tickets/inbox" replace />} />
        <Route path="tickets/inbox" element={<InboxView />} />
        <Route path="tickets/escalations" element={<EscalationsView />} />
        <Route path="tickets/reports" element={<ReportsView />} />
        <Route path="tickets/settings" element={<SettingsView />} />
        <Route path="sprint-planner" element={<SprintPlannerPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}