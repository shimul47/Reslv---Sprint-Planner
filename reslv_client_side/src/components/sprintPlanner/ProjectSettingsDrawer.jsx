import { useEffect, useState } from "react";
import api from "../../api/axios";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";

// Admin/manager-only drawer for scoping company employees onto this
// project — this is where "admin assigns an employee to a particular
// project" happens, without touching any other company/project's data.
export default function ProjectSettingsDrawer({ onClose }) {
  const { activeProject, canManageActiveProject } = useSprintPlanner();
  const [members, setMembers] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [membersRes, teamRes] = await Promise.all([
        api.get(`/sprint-planner/projects/${activeProject._id}/members`),
        api.get("/team"),
      ]);
      setMembers(membersRes.data.members || []);
      setCompanyUsers((teamRes.data.team || []).filter((m) => m.type === "user"));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load project members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProject) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?._id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      await api.post(`/sprint-planner/projects/${activeProject._id}/members`, {
        userId: selectedUserId,
        projectRole: selectedRole,
        title: selectedTitle,
      });
      setSelectedUserId("");
      setSelectedTitle("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add member.");
    }
  };

  const handleRemove = async (userId) => {
    try {
      await api.delete(`/sprint-planner/projects/${activeProject._id}/members/${userId}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove member.");
    }
  };

  const availableUsers = companyUsers.filter(
    (u) => !members.some((m) => m.userId?._id === u.id),
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 text-left">
      <div className="w-full max-w-md bg-[var(--color-background)] h-full shadow-2xl p-6 overflow-y-auto flex flex-col border-l border-[var(--color-border)] animate-slide-in">
        <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-h)]">Project Members</h2>
            <span className="text-[10px] uppercase text-[var(--text)] tracking-wider">
              {activeProject?.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[var(--text)] hover:text-[var(--text-h)] px-2 py-1 bg-[var(--color-muted)] rounded-sm cursor-pointer"
          >
            Close
          </button>
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {loading ? (
          <p className="text-xs text-[var(--text)] opacity-60">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2 mb-6">
            {members.length === 0 && (
              <p className="text-xs text-[var(--text)] opacity-60">No members assigned yet.</p>
            )}
            {members.map((m) => (
              <div
                key={m.userId?._id || m._id}
                className="flex items-center justify-between bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-h)] truncate">
                    {m.userId?.name || "Unknown"}
                  </p>
                  <p className="text-[10px] text-[var(--text)] opacity-70 truncate">
                    {m.title || "No title set"} · {m.projectRole}
                  </p>
                </div>
                {canManageActiveProject && (
                  <button
                    onClick={() => handleRemove(m.userId?._id)}
                    className="text-[10px] text-red-500 hover:underline cursor-pointer flex-shrink-0 ml-2"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {canManageActiveProject && (
          <form
            onSubmit={handleAdd}
            className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
              Assign an employee
            </h3>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden"
            >
              <option value="">Select a team member…</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Title on this project (e.g. Frontend Developer)"
              value={selectedTitle}
              onChange={(e) => setSelectedTitle(e.target.value)}
              className="text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden"
            />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded p-2 focus:outline-hidden"
            >
              <option value="member">Member — works assigned tasks only</option>
              <option value="manager">Manager — can edit backlog/sprints & publish</option>
            </select>
            <button
              type="submit"
              disabled={!selectedUserId}
              className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold px-3 py-2 rounded cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to project
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
