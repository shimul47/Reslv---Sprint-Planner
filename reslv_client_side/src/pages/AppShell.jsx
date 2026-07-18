import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { NewTicketModal } from '../components/workspace/Overlays';
function navIdFromPath(pathname) {
  if (pathname.startsWith('/tickets/escalations')) return 'escalations';
  if (pathname.startsWith('/tickets/reports')) return 'reports';
  if (pathname.startsWith('/tickets/settings')) return 'settings';
  return 'inbox';
}

export default function AppShell({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNewTicket, setShowNewTicket] = useState(false);

  const onSprintPlanner = location.pathname.startsWith('/sprint-planner');
  const activeNav = navIdFromPath(location.pathname);

  const NAV_TO_PATH = {
    inbox: '/tickets/inbox',
    escalations: '/tickets/escalations',
    reports: '/tickets/reports',
    settings: '/tickets/settings',
  };

  return (
    <div className="flex min-h-screen w-full bg-[var(--background)] overflow-hidden">
      {/* 1. Sidebar Nav Component Layer */}
      <Sidebar
        nav={activeNav}
        setNav={(id) => navigate(NAV_TO_PATH[id] ?? '/tickets/inbox')}
        onNew={() => setShowNewTicket(true)}
        onLogout={onLogout}
      />

      {/* 2. Main Layout Shell Workspace Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-end px-6 py-3">
          {!onSprintPlanner ? (
            <button
              type="button"
              onClick={() => navigate('/sprint-planner')}
              className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold px-4 py-2 rounded-[var(--radius-sm)] shadow-[var(--shadow)] hover:opacity-90 transition-all cursor-pointer"
            >
              📅 Open Sprint Planner
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/tickets/inbox')}
              className="bg-[var(--color-muted)] text-[var(--color-foreground)] text-xs font-semibold px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] shadow-[var(--shadow)] hover:bg-[var(--color-secondary)] transition-all cursor-pointer"
            >
              &larr; Back to Tickets System
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Outlet />
        </div>

      </main>

      {showNewTicket && (
        <NewTicketModal onClose={() => setShowNewTicket(false)} />
      )}
    </div>
  );
}