import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { NewTicketModal } from "../components/workspace/Overlays";

function navIdFromPath(pathname) {
  if (pathname.startsWith("/tickets/escalations")) return "escalations";
  if (pathname.startsWith("/tickets/reports")) return "reports";
  if (pathname.startsWith("/tickets/settings")) return "settings";
  return "inbox";
}

export default function AppShell({ onLogout, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNewTicket, setShowNewTicket] = useState(false);

  // Determine if the user has admin rights (can access Sprint Planner & Team Management)
  const isAdmin =
    user?.roles?.some((role) => ["superadmin", "admin"].includes(role)) ??
    false;

  // Determine current active application/view
  const isDashboard =
    location.pathname === "/" || location.pathname === "/dashboard";
  const isSprintPlanner = location.pathname.startsWith("/sprint-planner");
  const isTickets = location.pathname.startsWith("/tickets");

  // We'll also check if we are in the new admin section
  const isAdminSection = location.pathname.startsWith("/admin");

  const activeNav = navIdFromPath(location.pathname);

  const NAV_TO_PATH = {
    inbox: "/tickets/inbox",
    escalations: "/tickets/escalations",
    reports: "/tickets/reports",
    settings: "/tickets/settings",
  };

  // Redirect unauthorized users away from restricted areas back to dashboard
  if ((isSprintPlanner || isAdminSection) && !isAdmin) {
    navigate("/");
    return null;
  }

  // 1. Dashboard Hub/Launchpad View (Themed)
  if (isDashboard) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col text-[var(--color-foreground)]">
        <header className="px-8 py-5 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--background)]/80 backdrop-blur-sm">
          <h1 className="text-xl font-bold">Workspace Dashboard</h1>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm opacity-60">
                Logged in as:{" "}
                <strong className="opacity-100">{user.name}</strong> (
                {user.roles?.[0]})
              </span>
            )}
            <button
              onClick={onLogout}
              className="text-sm font-medium opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto p-8 mt-10">
          <h2 className="text-3xl font-semibold mb-8">
            Where would you like to go?
          </h2>

          <div
            className={`grid grid-cols-1 ${isAdmin ? "md:grid-cols-3" : "max-w-md mx-auto"} gap-6`}
          >
            {/* Ticket System Card */}
            <div
              onClick={() => navigate("/tickets/inbox")}
              className="bg-[var(--background)] p-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] hover:shadow-lg hover:border-[var(--color-primary)] hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="h-14 w-14 bg-[var(--color-secondary)] text-[var(--color-foreground)] rounded-[var(--radius-md)] flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform">
                🎫
              </div>
              <h3 className="text-xl font-bold mb-2">Ticket System</h3>
              <p className="opacity-70 text-sm leading-relaxed">
                Manage customer support requests, view escalations, generate
                reports, and control inbox settings.
              </p>
            </div>

            {/* Sprint Planner Card - Admin Only */}
            {isAdmin && (
              <div
                onClick={() => navigate("/sprint-planner")}
                className="bg-[var(--background)] p-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] hover:shadow-lg hover:border-[var(--color-primary)] hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="h-14 w-14 bg-[var(--color-secondary)] text-[var(--color-foreground)] rounded-[var(--radius-md)] flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform">
                  📅
                </div>
                <h3 className="text-xl font-bold mb-2">Sprint Planner</h3>
                <p className="opacity-70 text-sm leading-relaxed">
                  Organize your team's upcoming tasks, plan out sprints, and
                  track development progress.
                </p>
              </div>
            )}

            {/* NEW: Team Management Card - Admin Only */}
            {isAdmin && (
              <div
                onClick={() => navigate("/admin/team")}
                className="bg-[var(--background)] p-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] hover:shadow-lg hover:border-[var(--color-primary)] hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="h-14 w-14 bg-[var(--color-secondary)] text-[var(--color-foreground)] rounded-[var(--radius-md)] flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform">
                  👥
                </div>
                <h3 className="text-xl font-bold mb-2">Team Management</h3>
                <p className="opacity-70 text-sm leading-relaxed">
                  Invite teammates via email, assign workspace roles, and
                  control access permissions.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // 2. Sub-system Shell View (Tickets, Sprint Planner, or Admin Team View)
  return (
    <div className="flex h-screen w-full bg-[var(--background)] overflow-hidden text-[var(--color-foreground)]">
      {/* Sidebar - Only renders when inside the Tickets System */}
      {isTickets && (
        <Sidebar
          nav={activeNav}
          setNav={(id) => navigate(NAV_TO_PATH[id] ?? "/tickets/inbox")}
          onNew={() => setShowNewTicket(true)}
          onLogout={onLogout}
        />
      )}

      {/* Main Layout Shell Workspace Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--background)]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm font-semibold opacity-70 hover:opacity-100 transition-opacity flex items-center gap-2 cursor-pointer"
            >
              &larr; Dashboard
            </button>
            <div className="h-5 w-px bg-[var(--color-border)]"></div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              {isTickets && "🎫 Ticket System"}
              {isSprintPlanner && "📅 Sprint Planner"}
              {isAdminSection && "👥 Team Management"}
            </h2>
          </div>

          {/* Dynamic Switch Button depending on Authorization */}
          <div className="flex items-center">
            {isTickets ? (
              isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate("/sprint-planner")}
                  className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold px-4 py-2 rounded-[var(--radius-sm)] shadow-[var(--shadow)] hover:opacity-90 transition-all cursor-pointer"
                >
                  Switch to Sprint Planner &rarr;
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => navigate("/tickets/inbox")}
                className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold px-4 py-2 rounded-[var(--radius-sm)] shadow-[var(--shadow)] hover:opacity-90 transition-all cursor-pointer"
              >
                Switch to Tickets &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Main Application Outlet */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Outlet />
        </div>
      </main>

      {/* Overlays */}
      {showNewTicket && (
        <NewTicketModal onClose={() => setShowNewTicket(false)} />
      )}
    </div>
  );
}
