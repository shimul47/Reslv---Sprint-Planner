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

const NAV_TO_PATH = {
  inbox: "/tickets/inbox",
  escalations: "/tickets/escalations",
  reports: "/tickets/reports",
  settings: "/tickets/settings",
};

export default function TicketSystemPage({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNewTicket, setShowNewTicket] = useState(false);

  const activeNav = navIdFromPath(location.pathname);

  return (
    <div className="flex h-screen w-full bg-[var(--background)] overflow-hidden text-[var(--color-foreground)]">
      <Sidebar
        nav={activeNav}
        setNav={(id) => navigate(NAV_TO_PATH[id] ?? "/tickets/inbox")}
        onNew={() => setShowNewTicket(true)}
        onLogout={onLogout}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--background)]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="text-sm font-semibold opacity-70 hover:opacity-100 transition-opacity flex items-center gap-2 cursor-pointer"
            >
              &larr; Dashboard
            </button>
            <div className="h-5 w-px bg-[var(--color-border)]"></div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              🎫 Ticket System
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Outlet />
        </div>
      </main>

      {showNewTicket && (
        <NewTicketModal onClose={() => setShowNewTicket(false)} />
      )}
    </div>
  );
}
