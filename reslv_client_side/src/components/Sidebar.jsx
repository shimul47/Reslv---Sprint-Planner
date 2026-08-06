import { useContext, useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart2,
  ChevronDown,
  LogOut,
  Plus,
  Settings,
  Zap,
  Inbox,
} from "lucide-react";
import { io } from "socket.io-client";
import { APP_ORG, APP_TITLE } from "../data/workspaceData.js";
import { Av } from "./workspace/Atoms.jsx";
import api from "../api/axios.js";
import { AuthContext } from "../context/AuthContext.jsx";

export default function Sidebar({ nav, setNav, onNew, onLogout }) {
  const { user } = useContext(AuthContext);
  const isAdmin = ["admin", "superadmin"].includes(user?.roles?.[0]);
  const [counts, setCounts] = useState({ open: 0, escalated: 0 });

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const response = await api.get("/tickets");
        const tickets = response.data?.tickets || [];
        setCounts({
          open: tickets.filter(
            (t) => t.status === "open" || t.status === "in-progress",
          ).length,
          escalated: tickets.filter((t) => t.status === "escalated").length,
        });
      } catch (error) {
        console.error("Unable to load sidebar ticket counts:", error);
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

  const NAV = [
    {
      id: "inbox",
      label: "Inbox",
      icon: <Inbox size={15} />,
      badge: counts.open,
    },
    {
      id: "escalations",
      label: "Escalations",
      icon: <ArrowRight size={15} />,
      badge: counts.escalated,
      warn: true,
    },
    ...(isAdmin
      ? [
          { id: "reports", label: "Reports", icon: <BarChart2 size={15} /> },
          { id: "settings", label: "Settings", icon: <Settings size={15} /> },
        ]
      : []),
  ];

  return (
    <div
      className="w-[210px] flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #EEEEFF 0%, #E8E8FF 100%)",
        borderRight: "1px solid rgba(128,128,200,0.14)",
      }}
    >
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #80A8FF, #CEB5FF)" }}
          >
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-[16px] font-bold text-[#18182E] tracking-tight">
            {APP_TITLE}
          </span>
        </div>
        <button className="flex items-center gap-1 text-[11px] font-medium text-[#6B6B90] hover:text-[#5B5BD6] transition-colors mt-0.5 ml-[42px] max-w-[150px]">
          <span className="truncate">{user?.companyName || APP_ORG}</span>
          <ChevronDown size={10} className="flex-shrink-0" />
        </button>
      </div>
      <div className="px-4 mb-3">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-white text-[13px] font-semibold rounded-xl transition-colors shadow-sm"
          style={{ background: "linear-gradient(135deg, #80A8FF, #7090EE)" }}
        >
          <Plus size={14} /> New Ticket
        </button>
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setNav(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all ${nav === item.id ? "bg-white text-[#18182E] font-semibold shadow-sm" : "text-[#6B6B90] hover:bg-[rgba(255,255,255,0.55)] hover:text-[#18182E]"}`}
          >
            <span
              className={nav === item.id ? "text-[#80A8FF]" : "text-[#C0C0D8]"}
            >
              {item.icon}
            </span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.warn ? "bg-[#FFF2E5] text-[#BB5E18]" : "bg-[#EEF0FF] text-[#5B5BD6]"}`}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-[rgba(128,128,200,0.14)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Av
            initials={(user?.name || "U")
              .split(/\s+/)
              .filter(Boolean)
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
            hue={252}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[#18182E] truncate">
              {user?.name || "Unknown"}
            </p>
            <p className="text-[11px] text-[#A8A8C0] capitalize">
              {user?.roles?.[0] || "Agent"}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="text-[#C8C8E0] hover:text-[#9898B8] transition-colors"
            aria-label="Log out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
