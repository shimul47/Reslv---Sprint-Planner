import { useContext, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart2, CheckCircle, Inbox, Lock, Plus, Settings, Star } from "lucide-react";
import { io } from "socket.io-client";
import api from "../api/axios.js";
import { AuthContext } from "../context/AuthContext.jsx";
import { roleCan } from "../utils/permissions.js";
import { NewTicketModal } from "../components/workspace/Overlays";

export default function TicketsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeRole, plan } = useContext(AuthContext);
  const isAdmin = roleCan(activeRole, user?.roles, ["admin", "superadmin"]);
  const isSuperAdmin = user?.roles?.includes("superadmin");
  const reportsLocked = !isSuperAdmin && !plan?.features?.reports;

  const [showNewTicket, setShowNewTicket] = useState(false);
  const [counts, setCounts] = useState({ unread: 0, escalated: 0, resolved: 0 });

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const response = await api.get("/tickets");
        const tickets = response.data?.tickets || [];
        setCounts({
          unread: tickets.reduce((sum, t) => sum + (t.unreadCount || 0), 0),
          escalated: tickets.filter((t) => t.status === "escalated").length,
          resolved: tickets.filter((t) => t.status === "resolved").length,
        });
      } catch (error) {
        console.error("Unable to load ticket tab counts:", error);
      }
    };

    loadCounts();

    if (!user?.companyId) return;

    const socket = io(import.meta.env.VITE_WS_URL || "http://localhost:5000", {
      transports: ["websocket"],
    });

    socket.emit("company:join", user.companyId);
    const refresh = () => loadCounts();
    socket.on("ticket:created", refresh);
    socket.on("ticket:updated", refresh);
    socket.on("ticket:message", refresh);

    return () => socket.disconnect();
  }, [user?.companyId]);

  const TABS = [
    { id: "inbox", label: "Inbox", path: "inbox", icon: <Inbox size={14} />, badge: counts.unread },
    {
      id: "escalations",
      label: "Escalations",
      path: "escalations",
      icon: <ArrowRight size={14} />,
      badge: counts.escalated,
      warn: true,
    },
    {
      id: "resolved",
      label: "Resolved",
      path: "resolved",
      icon: <CheckCircle size={14} />,
      badge: counts.resolved,
    },
    ...(isAdmin
      ? [
          {
            id: "reports",
            label: "Reports",
            path: "reports",
            icon: reportsLocked ? <Lock size={14} /> : <BarChart2 size={14} />,
            locked: reportsLocked,
          },
          { id: "feedback", label: "Feedback", path: "feedback", icon: <Star size={14} /> },
          { id: "settings", label: "Settings", path: "settings", icon: <Settings size={14} /> },
        ]
      : []),
  ];

  const activeTab = TABS.find((t) => location.pathname.endsWith(`/${t.path}`))?.id || "inbox";

  return (
    <div className="flex-1 w-full bg-[var(--background)] flex flex-col overflow-hidden">
      <div className="px-6 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)]">
        <div>
          <h2 className="!mb-0 text-2xl font-bold tracking-tight text-[var(--text-h)]">
            Ticket Inbox
          </h2>
          <p className="text-xs text-[var(--text)] mt-0.5">
            Manage customer support requests, escalations, and resolutions.
          </p>
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={14} /> New Ticket
        </button>
      </div>

      <div className="px-6 pt-3 flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => (tab.locked ? navigate("/billing") : navigate(tab.path))}
            title={tab.locked ? "Requires the Professional plan or higher" : undefined}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              tab.locked ? "opacity-60" : ""
            } ${
              activeTab === tab.id
                ? "border-[var(--color-primary)] text-[var(--text-h)]"
                : "border-transparent text-[var(--text)] opacity-70 hover:opacity-100"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab.warn
                    ? "bg-[#FFF2E5] text-[#BB5E18]"
                    : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>

      {showNewTicket && <NewTicketModal onClose={() => setShowNewTicket(false)} />}
    </div>
  );
}
