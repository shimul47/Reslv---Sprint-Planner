import { useContext, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import api from "../../api/axios";
import { AuthContext } from "../../context/AuthContext.jsx";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";
import { roleCan } from "../../utils/permissions.js";

export default function ProjectSwitcher() {
  const { user, activeRole } = useContext(AuthContext);
  const { projects, activeProjectId, setActiveProjectId, refreshProjects, loading } =
    useSprintPlanner();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const canCreateProject = roleCan(activeRole, user?.roles, [
    "superadmin",
    "admin",
    "sprint_planner",
  ]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await api.post("/sprint-planner/projects", { name: name.trim() });
      setName("");
      setCreating(false);
      await refreshProjects();
      setActiveProjectId(res.data.project._id);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project.");
    }
  };

  if (loading && projects.length === 0) {
    return <div className="text-xs text-[var(--text)] opacity-60">Loading projects…</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={activeProjectId || ""}
          onChange={(e) => setActiveProjectId(e.target.value)}
          className="appearance-none text-sm font-semibold bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--text-h)] rounded-[var(--radius-sm)] pl-3 pr-8 py-1.5 focus:outline-hidden cursor-pointer"
        >
          {projects.length === 0 && <option value="">No projects yet</option>}
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text)] opacity-60"
        />
      </div>

      {canCreateProject &&
        (creating ? (
          <form onSubmit={handleCreate} className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded px-2 py-1.5 focus:outline-hidden w-40"
            />
            <button
              type="submit"
              className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] font-semibold px-2.5 py-1.5 rounded cursor-pointer hover:opacity-90"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError("");
              }}
              className="text-[11px] text-[var(--text)] opacity-70 hover:opacity-100 cursor-pointer"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            title="New project"
            className="flex items-center gap-1 text-[11px] font-medium text-[var(--text)] hover:text-[var(--text-h)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-[var(--color-muted)] cursor-pointer"
          >
            <Plus size={12} /> New Project
          </button>
        ))}
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
}
