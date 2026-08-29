import { useNavigate, useLocation, Outlet } from "react-router-dom";

const TABS = [
  { id: "monitoring", label: "Monitoring", path: "monitoring" },
  { id: "team", label: "Team", path: "team" },
  { id: "statistics", label: "Statistics", path: "statistics" },
  { id: "loyalty", label: "Loyalty Points", path: "loyalty" },
  { id: "config", label: "Configuration", path: "config" },
];

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab =
    TABS.find((t) => location.pathname.endsWith(`/${t.path}`))?.id || "monitoring";

  return (
    <div className="flex-1 w-full bg-[var(--background)] flex flex-col overflow-hidden">
      <div className="px-6 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)]">
        <div>
          <h2 className="!mb-0 text-2xl font-bold tracking-tight text-[var(--text-h)]">
            Admin
          </h2>
          <p className="text-xs text-[var(--text)] mt-0.5">
            System-wide parameters, activity, and team performance in one place.
          </p>
        </div>
      </div>

      <div className="px-6 pt-3 flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`text-xs font-semibold px-3 py-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[var(--color-primary)] text-[var(--text-h)]"
                : "border-transparent text-[var(--text)] opacity-70 hover:opacity-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
