import React, { useContext, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import RoleSwitcher from "../components/RoleSwitcher.jsx";
import { roleCan } from "../utils/permissions.js";
import { APP_TITLE } from "../data/workspaceData.js";

// --- Icons (Inline SVGs for independent rendering) ---
const Icons = {
  Home: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),
  Ticket: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
      />
    </svg>
  ),
  Calendar: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  Users: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  CreditCard: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  ),
  Settings: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  Logout: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  ),
  User: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  ChartBar: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 3v18h18M8 17V10m5 7V6m5 11v-4"
      />
    </svg>
  ),
};

export default function AppShell({ onLogout, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeRole } = useContext(AuthContext);

  // -- Sidebar visibility (manual toggle only, no auto-hide) --
  // Starts closed on mobile/tablet viewports (it would otherwise cover the
  // whole screen as an overlay) and open on desktop, matching the previous
  // always-open default there.
  const [sidebarVisible, setSidebarVisible] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024,
  );
  const revealSidebar = () => setSidebarVisible(true);
  const hideSidebarNow = () => setSidebarVisible(false);

  // -- Permissions --
  const isAdmin = roleCan(activeRole, user?.roles, ["superadmin", "admin"]);
  const canSeeTickets = roleCan(activeRole, user?.roles, [
    "superadmin",
    "admin",
    "agent",
  ]);
  const canSeeSprintPlanner = roleCan(activeRole, user?.roles, [
    "superadmin",
    "admin",
    "sprint_planner",
    "employee",
  ]);

  // -- Route Matching --
  const isDashboard =
    location.pathname === "/" || location.pathname === "/dashboard";
  const isSprintPlanner = location.pathname.startsWith("/sprint-planner");
  const isBilling = location.pathname.startsWith("/billing");
  const isAdminSection = location.pathname.startsWith("/admin/panel");
  const isProfile = location.pathname.startsWith("/profile");
  const isTickets = location.pathname.startsWith("/tickets");

  const isRestrictedForUser =
    (isSprintPlanner && !canSeeSprintPlanner) ||
    ((isAdminSection || isBilling) && !isAdmin) ||
    (isTickets && !canSeeTickets);

  useEffect(() => {
    if (isRestrictedForUser) {
      navigate("/");
    }
  }, [isRestrictedForUser, navigate]);

  if (isRestrictedForUser) return null;

  // -- Navigation Config --
  const navItems = [
    {
      label: "Dashboard",
      path: "/",
      icon: <Icons.Home />,
      show: true,
      active: isDashboard,
    },
    {
      label: "Tickets",
      path: "/tickets/inbox",
      icon: <Icons.Ticket />,
      show: canSeeTickets,
      active: isTickets,
    },
    {
      label: "Sprint Planner",
      path: "/sprint-planner",
      icon: <Icons.Calendar />,
      show: canSeeSprintPlanner,
      active: isSprintPlanner,
    },
    {
      label: "Admin",
      path: "/admin/panel/monitoring",
      icon: <Icons.Users />,
      show: isAdmin,
      active: isAdminSection,
    },
    {
      label: "Billing",
      path: "/billing",
      icon: <Icons.CreditCard />,
      show: isAdmin,
      active: isBilling,
    },
  ];

  // Helper to extract a page title for the header
  const getPageTitle = () => {
    if (isDashboard) return "Workspace Overview";
    if (isTickets) {
      if (location.pathname.startsWith("/tickets/escalations")) return "Escalations";
      if (location.pathname.startsWith("/tickets/resolved")) return "Resolved Tickets";
      if (location.pathname.startsWith("/tickets/reports")) return "Reports";
      if (location.pathname.startsWith("/tickets/feedback")) return "Support Operations";
      if (location.pathname.startsWith("/tickets/settings")) return "Ticket Settings";
      return "Ticket Inbox";
    }
    if (isSprintPlanner) return "Sprint Planner";
    if (isAdminSection) {
      const tab = location.pathname.split("/")[3] || "monitoring";
      const tabTitles = {
        monitoring: "Admin: Monitoring",
        team: "Admin: Team",
        statistics: "Admin: Statistics",
        loyalty: "Admin: Loyalty Points",
        config: "Admin: Configuration",
      };
      return tabTitles[tab] || "Admin";
    }
    if (isBilling) return "Billing & Subscription";
    if (isProfile) return "My Profile";
    return "Application";
  };

  // On mobile/tablet the sidebar is an overlay drawer, so a nav click should
  // also close it; on desktop it stays open (matches the old always-open
  // behavior there).
  const closeSidebarOnMobileNav = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      hideSidebarNow();
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#f8f9fa] dark:bg-[var(--background)] text-[var(--color-foreground)] overflow-hidden font-sans">
      {/* Backdrop behind the sidebar drawer on mobile/tablet, where it overlays
          content instead of pushing it. */}
      {sidebarVisible && (
        <div
          onClick={hideSidebarNow}
          aria-hidden="true"
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
        />
      )}

      {/* 1. PERSISTENT SIDEBAR (manual show/hide via the toggle button) */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 sm:w-64 border-r border-[var(--color-border)] bg-white dark:bg-[var(--background)] flex flex-col justify-between z-30 shadow-xl transition-transform duration-300 ease-in-out ${
          sidebarVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Reslv Brand / Logo Area */}
        <div>
          <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--color-border)]">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ background: "linear-gradient(135deg, #80A8FF, #CEB5FF)" }}
              >
                <Zap size={14} className="text-white" />
              </div>
              <span className="font-semibold text-lg tracking-tight">
                {APP_TITLE}
              </span>
            </div>
            <button
              type="button"
              onClick={hideSidebarNow}
              aria-label="Hide navigation"
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-[var(--color-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer flex-shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Main Navigation */}
          <nav className="p-4 space-y-1">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-2">
              Menu
            </div>
            {navItems
              .filter((item) => item.show)
              .map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={closeSidebarOnMobileNav}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
          </nav>
        </div>

        {/* Bottom User Area */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <Link
            to="/profile"
            onClick={closeSidebarOnMobileNav}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-1 ${
              isProfile
                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Icons.User />
            Profile Settings
          </Link>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Icons.Logout />
            Log out
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA — shifts right to make room for the sidebar only
          on large screens; on mobile/tablet the sidebar overlays on top instead */}
      <div
        className={`h-full flex flex-col min-w-0 overflow-hidden relative transition-[margin-left,width] duration-300 ease-in-out ml-0 w-full ${
          sidebarVisible ? "lg:ml-64 lg:w-[calc(100%-16rem)]" : ""
        }`}
      >
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 bg-white dark:bg-[var(--background)] border-b border-[var(--color-border)] px-3 sm:px-6 flex items-center justify-between gap-2 z-10 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {!sidebarVisible && (
              <button
                type="button"
                onClick={revealSidebar}
                aria-label="Show navigation"
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-[var(--color-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            )}
            <h1 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-5 flex-shrink-0">
            {/* Role Switcher Inject */}
            {user && (
              <div className="hidden sm:flex items-center gap-3 border-r border-[var(--color-border)] pr-3 sm:pr-5">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Role:
                </span>
                <RoleSwitcher className="text-sm font-semibold" />
              </div>
            )}

            {/* User Profile Snippet */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/profile")}
            >
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-gray-800 dark:text-white leading-tight">
                  {user?.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-blue-400 flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Canvas */}
        <main
          className={`flex-1 overflow-y-auto bg-[#f8f9fa] dark:bg-black/20 ${
            isDashboard ? "p-4 sm:p-6 md:p-8" : "p-3 md:p-4"
          }`}
        >
          {isDashboard ? (
            <div key="dashboard" className="max-w-5xl mx-auto animate-in fade-in duration-500">
              <header className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Good afternoon, {user?.name.split(" ")[0]}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Here is what's happening in your workspace today.
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Tickets Widget */}
                {canSeeTickets && (
                  <div
                    onClick={() => navigate("/tickets/inbox")}
                    className="bg-white dark:bg-[var(--background)] p-6 rounded-xl border border-[var(--color-border)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] hover:border-[var(--color-primary)] transition-[box-shadow,border-color] duration-200 cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <Icons.Ticket />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                      Ticket Inbox
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      View customer requests, handle escalations, and manage
                      support flow.
                    </p>
                  </div>
                )}

                {/* Sprint Planner Widget */}
                {canSeeSprintPlanner && (
                  <div
                    onClick={() => navigate("/sprint-planner")}
                    className="bg-white dark:bg-[var(--background)] p-6 rounded-xl border border-[var(--color-border)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] hover:border-[var(--color-primary)] transition-[box-shadow,border-color] duration-200 cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <Icons.Calendar />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                      Sprint Planner
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Track development milestones, organize tasks, and manage
                      upcoming sprints.
                    </p>
                  </div>
                )}

                {/* Admin Widget */}
                {isAdmin && (
                  <div
                    onClick={() => navigate("/admin/panel/team")}
                    className="bg-white dark:bg-[var(--background)] p-6 rounded-xl border border-[var(--color-border)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] hover:border-[var(--color-primary)] transition-[box-shadow,border-color] duration-200 cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <Icons.Users />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                      Team Management
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Invite new agents, manage workspace roles, and control
                      access permissions.
                    </p>
                  </div>
                )}

                {/* Billing Widget */}
                {isAdmin && (
                  <div
                    onClick={() => navigate("/billing")}
                    className="bg-white dark:bg-[var(--background)] p-6 rounded-xl border border-[var(--color-border)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] hover:border-[var(--color-primary)] transition-[box-shadow,border-color] duration-200 cursor-pointer group"
                  >
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <Icons.CreditCard />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                      Billing & Limits
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Check subscription status, download invoices, and upgrade
                      your plan.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Sub-system Outlet Area */
            <div key="outlet" className="h-full w-full bg-white dark:bg-[var(--background)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
