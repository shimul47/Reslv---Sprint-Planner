import { Bell, BarChart2, Settings } from "lucide-react";
import { useState } from "react";
import { APP_DATE } from "../data/workspaceData.js";
import {
  NotifDropdown,
  NewTicketModal,
} from "../components/workspace/Overlays.jsx";
import Sidebar from "../components/Sidebar.jsx";
import {
  EscalationsView,
  InboxView,
  StatsBar,
} from "../components/workspace/Views.jsx";

export default function AppShell({ onLogout }) {
  const [nav, setNav] = useState("inbox");
  const [showNew, setShowNew] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  return (
    <div
      className="h-screen flex overflow-hidden bg-[#F7F7FF]"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <Sidebar
        nav={nav}
        setNav={setNav}
        onNew={() => setShowNew(true)}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex-shrink-0 flex items-center justify-between px-5 py-1.5 border-b border-[rgba(128,128,200,0.08)] bg-white h-15">
          {" "}
          <div className="flex items-center gap-1 leading-none">
            <h1 className="text-[12px] font-semibold text-[#18182E] leading-none">
              {nav === "inbox"
                ? "Ticket Inbox"
                : nav === "escalations"
                  ? "Escalations"
                  : nav.charAt(0).toUpperCase() + nav.slice(1)}
            </h1>
            <p className="text-[9px] text-[#B0B0CC] leading-none">{APP_DATE}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowNotif((v) => !v)}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[#A8A8C0] hover:bg-[#EEF0FF] hover:text-[#5B5BD6] transition-colors"
            >
              <Bell size={14} />
              <span className="absolute top-1.25 right-1.25 w-1.5 h-1.5 bg-[#CC1836] rounded-full border border-white" />
            </button>
            {showNotif && <NotifDropdown onClose={() => setShowNotif(false)} />}
          </div>
        </header>

        {nav === "inbox" && <StatsBar />}

        <div className="flex-1 overflow-hidden flex min-h-0">
          {nav === "inbox" && <InboxView />}
          {nav === "escalations" && <EscalationsView />}
          {nav === "reports" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF0FF] flex items-center justify-center mb-4">
                <BarChart2 size={24} className="text-[#CEB5FF]" />
              </div>
              <p className="text-[14px] font-semibold text-[#18182E]">
                Reports
              </p>
              <p className="text-[13px] text-[#9898B8] mt-1">
                Analytics dashboard coming soon.
              </p>
            </div>
          )}
          {nav === "settings" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF0FF] flex items-center justify-center mb-4">
                <Settings size={24} className="text-[#CEB5FF]" />
              </div>
              <p className="text-[14px] font-semibold text-[#18182E]">
                Settings
              </p>
              <p className="text-[13px] text-[#9898B8] mt-1">
                Workspace configuration coming soon.
              </p>
            </div>
          )}
        </div>
      </div>

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
