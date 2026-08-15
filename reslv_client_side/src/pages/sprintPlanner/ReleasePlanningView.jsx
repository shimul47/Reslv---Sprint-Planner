import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../api/axios";
import { useSprintPlanner } from "../../context/SprintPlannerContext.jsx";
import { StatTile } from "../../components/sprintPlanner/ChartPrimitives.jsx";
import HelpTip from "../../components/sprintPlanner/HelpTip.jsx";

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default function ReleasePlanningView() {
  const { activeProject, canManageActiveProject } = useSprintPlanner();
  const [releases, setReleases] = useState([]);
  const [pbis, setPbis] = useState([]);
  const [activeReleaseId, setActiveReleaseId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const loadReleases = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError("");
    try {
      const [releasesRes, pbisRes] = await Promise.all([
        api.get(`/sprint-planner/projects/${activeProject._id}/releases`),
        api.get(`/sprint-planner/projects/${activeProject._id}/pbis`),
      ]);
      setReleases(releasesRes.data.releases || []);
      setPbis(pbisRes.data.pbis || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load releases.");
    } finally {
      setLoading(false);
    }
  }, [activeProject?._id]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  useEffect(() => {
    if (releases.length === 0) {
      setActiveReleaseId(null);
      return;
    }
    setActiveReleaseId((current) => (releases.some((r) => r._id === current) ? current : releases[0]._id));
  }, [releases]);

  const loadDetail = useCallback(async () => {
    if (!activeProject || !activeReleaseId) {
      setDetail(null);
      return;
    }
    try {
      const res = await api.get(
        `/sprint-planner/projects/${activeProject._id}/releases/${activeReleaseId}`,
      );
      setDetail(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load release detail.");
    }
  }, [activeProject?._id, activeReleaseId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await api.post(`/sprint-planner/projects/${activeProject._id}/releases`, {
        name: name.trim(),
        targetDate: targetDate || null,
      });
      setName("");
      setTargetDate("");
      setCreating(false);
      await loadReleases();
      setActiveReleaseId(res.data.release._id);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create release.");
    }
  };

  const assignPbi = async (pbiId, releaseId) => {
    try {
      await api.patch(`/sprint-planner/projects/${activeProject._id}/pbis/${pbiId}`, { releaseId });
      await Promise.all([loadReleases(), loadDetail()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update backlog item.");
    }
  };

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[var(--text)] opacity-60">
        Select or create a project to plan releases.
      </div>
    );
  }

  const inRelease = pbis.filter((p) => (p.releaseId?._id || p.releaseId) === activeReleaseId);
  const unassigned = pbis.filter((p) => !p.releaseId);

  return (
    <div className="p-6 flex gap-6">
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        <HelpTip title="Release Planning">
          Group backlog items into a release, then track projected completion based on your
          team's recent velocity (points completed per closed sprint).
        </HelpTip>
        {canManageActiveProject && (
          <div>
            {creating ? (
              <form onSubmit={handleCreate} className="flex flex-col gap-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3">
                <input
                  autoFocus
                  type="text"
                  placeholder="Release name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded px-2 py-1.5 focus:outline-hidden"
                />
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="text-xs bg-[var(--color-input-background)] border border-[var(--color-border)] rounded px-2 py-1.5 focus:outline-hidden"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[11px] font-semibold px-2.5 py-1.5 rounded cursor-pointer hover:opacity-90">
                    Create
                  </button>
                  <button type="button" onClick={() => setCreating(false)} className="text-[11px] text-[var(--text)] opacity-70 hover:opacity-100 cursor-pointer">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center justify-center gap-1.5 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold px-3 py-2 rounded-[var(--radius-sm)] shadow-[var(--shadow)] cursor-pointer hover:opacity-90"
              >
                <Plus size={13} /> New Release
              </button>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-xs text-[var(--text)] opacity-60">Loading…</p>
        ) : releases.length === 0 ? (
          <p className="text-xs text-[var(--text)] opacity-60">No releases yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {releases.map((r) => (
              <button
                key={r._id}
                onClick={() => setActiveReleaseId(r._id)}
                className={`text-left px-3 py-2 rounded-[var(--radius-sm)] text-xs transition-colors cursor-pointer ${
                  activeReleaseId === r._id
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--text-h)] hover:bg-[var(--color-muted)]"
                }`}
              >
                <p className="font-semibold truncate">{r.name}</p>
                <p className={`text-[10px] mt-0.5 ${activeReleaseId === r._id ? "opacity-90" : "opacity-60"}`}>
                  {r.remainingPoints}/{r.totalPoints} pts remaining · {r.status}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {!detail ? (
          <p className="text-xs text-[var(--text)] opacity-60">
            {releases.length === 0 ? "Create a release to start planning." : "Select a release."}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-h)]">{detail.release.name}</h3>
              <p className="text-xs text-[var(--text)] opacity-70">Target date: {formatDate(detail.release.targetDate)}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatTile label="Items" value={detail.release.pbiCount} />
              <StatTile label="Total Points" value={detail.release.totalPoints} />
              <StatTile label="Remaining Points" value={detail.release.remainingPoints} />
              <StatTile label="Remaining Hours" value={detail.release.remainingHours} />
            </div>

            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)] opacity-70 mb-2">
                Projected Completion
              </p>
              {detail.projection ? (
                <p className="text-sm text-[var(--text-h)]">
                  At the current velocity (~{Math.round(detail.projection.velocity)} pts/sprint over{" "}
                  {detail.projection.sampleSize} closed sprint(s)), this release needs about{" "}
                  <strong>{detail.projection.sprintsRemaining} more sprint(s)</strong>, projected around{" "}
                  <strong>{formatDate(detail.projection.projectedDate)}</strong>.
                </p>
              ) : (
                <p className="text-sm text-[var(--text)] opacity-70">
                  Not enough closed-sprint history yet to project a completion date.
                </p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)] opacity-70 mb-2">
                Items in this release
              </p>
              {inRelease.length === 0 ? (
                <p className="text-xs text-[var(--text)] opacity-60 mb-3">No items assigned yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5 mb-3">
                  {inRelease.map((p) => (
                    <div key={p._id} className="flex items-center justify-between bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs">
                      <span className="truncate">{p.title} {p.storyPoints != null && `(${p.storyPoints} pts)`}</span>
                      {canManageActiveProject && (
                        <button onClick={() => assignPbi(p._id, null)} className="text-[10px] text-red-500 hover:underline cursor-pointer flex-shrink-0 ml-2">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canManageActiveProject && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)] opacity-70 mb-2">
                    Add from backlog
                  </p>
                  {unassigned.length === 0 ? (
                    <p className="text-xs text-[var(--text)] opacity-60">No unassigned backlog items.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {unassigned.map((p) => (
                        <div key={p._id} className="flex items-center justify-between bg-[var(--color-background)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-sm)] px-3 py-2 text-xs">
                          <span className="truncate">{p.title} {p.storyPoints != null && `(${p.storyPoints} pts)`}</span>
                          <button onClick={() => assignPbi(p._id, activeReleaseId)} className="text-[10px] text-[var(--color-primary)] hover:underline cursor-pointer flex-shrink-0 ml-2">
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
