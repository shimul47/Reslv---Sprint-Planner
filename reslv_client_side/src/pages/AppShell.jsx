import React, { useContext, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import RoleSwitcher from "../components/RoleSwitcher.jsx";
import { roleCan } from "../utils/permissions.js";

export default function AppShell({ onLogout, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeRole } = useContext(AuthContext);

  const isAdmin = roleCan(activeRole, user?.roles, ["superadmin", "admin"]);
  // Ticket System is agent-only (plus admin/superadmin oversight); Sprint
  // Planner is sprint_planner-only (plus admin/superadmin oversight).
  // Employee has no dedicated page yet.
  const canSeeTickets = roleCan(activeRole, user?.roles, [
    "superadmin",
    "admin",
    "agent",
  ]);
  const canSeeSprintPlanner = roleCan(activeRole, user?.roles, [
    "superadmin",
    "admin",
    "sprint_planner",
  ]);

  const isDashboard =
    location.pathname === "/" || location.pathname === "/dashboard";
  const isSprintPlanner = location.pathname.startsWith("/sprint-planner");
  const isBilling = location.pathname.startsWith("/billing");
  const isAdminSection = location.pathname.startsWith("/admin");

  const isRestrictedForUser =
    (isSprintPlanner && !canSeeSprintPlanner) ||
    ((isAdminSection || isBilling) && !isAdmin);
  useEffect(() => {
    if (isRestrictedForUser) {
      navigate("/");
    }
  }, [isRestrictedForUser, navigate]);

  if (isRestrictedForUser) {
    return null;
  }

  // 1. Dashboard Hub
  if (isDashboard) {
    const visibleCardCount =
      (canSeeTickets ? 1 : 0) +
      (canSeeSprintPlanner ? 1 : 0) +
      (isAdmin ? 2 : 0); // Team Management + Billing

    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col text-[var(--color-foreground)]">
        <header className="px-8 py-5 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--background)]/80 backdrop-blur-sm">
          <h1 className="text-xl font-bold">Workspace Dashboard</h1>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-sm opacity-60 flex items-center gap-1.5">
                <span>
                  Logged in as <strong className="opacity-100">{user.name}</strong>
                </span>
                <span>·</span>
                <RoleSwitcher className="opacity-100 font-semibold" />
              </div>
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

          {visibleCardCount === 0 ? (
            <div className="max-w-md mx-auto text-center bg-[var(--background)] p-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)]">
              <div className="h-14 w-14 mx-auto bg-[var(--color-secondary)] rounded-[var(--radius-md)] flex items-center justify-center text-3xl mb-5">
                🛠️
              </div>
              <h3 className="text-xl font-bold mb-2">Nothing here yet</h3>
              <p className="opacity-70 text-sm leading-relaxed">
                A dedicated view for your assigned tasks is coming soon. Check
                back shortly.
              </p>
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 ${visibleCardCount > 1 ? "md:grid-cols-2 lg:grid-cols-4" : "max-w-md mx-auto"} gap-6`}
            >
              {/* Ticket System - Agent (+ Admin oversight) */}
              {canSeeTickets && (
                <div
                  onClick={() => navigate("/tickets/inbox")}
                  className="bg-[var(--background)] p-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] hover:shadow-lg hover:border-[var(--color-primary)] hover:-translate-y-1 transition-all cursor-pointer group"
                >
                  <div className="h-14 w-14 bg-[var(--color-secondary)] text-[var(--color-foreground)] rounded-[var(--radius-md)] flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform">
                    🎫
                  </div>
                  <h3 className="text-xl font-bold mb-2">Ticket System</h3>
                  <p className="opacity-70 text-sm leading-relaxed">
                    Manage customer support requests, view escalations,
                    generate reports, and control inbox settings.
                  </p>
                </div>
              )}

              {/* Sprint Planner - Sprint Planner (+ Admin oversight) */}
              {canSeeSprintPlanner && (
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

              {/* Team Management - Admin Only */}
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

              {/* Billing - Admin Only */}
              {isAdmin && (
                <div
                  onClick={() => navigate("/billing")}
                  className="bg-[var(--background)] p-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] hover:shadow-lg hover:border-[var(--color-primary)] hover:-translate-y-1 transition-all cursor-pointer group"
                >
                  <div className="h-14 w-14 bg-[var(--color-secondary)] text-[var(--color-foreground)] rounded-[var(--radius-md)] flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform">
                    💳
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    Billing & Subscription
                  </h3>
                  <p className="opacity-70 text-sm leading-relaxed">
                    Manage your subscription plan, view invoices, and update
                    payment details.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // 2. Sub-system Shell
  return (
    <div className="flex h-screen w-full bg-[var(--background)] overflow-hidden text-[var(--color-foreground)]">
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
              {isSprintPlanner && "📅 Sprint Planner"}
              {isAdminSection && "👥 Team Management"}
              {isBilling && "💳 Billing & Subscription"}
            </h2>
          </div>

          <div className="flex items-center">
            {canSeeTickets && (
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

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
