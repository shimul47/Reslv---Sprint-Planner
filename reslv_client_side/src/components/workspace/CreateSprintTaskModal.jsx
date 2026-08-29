import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import api from "../../api/axios.js";

const TASK_TYPES = [
  { id: "bug", label: "Bug" },
  { id: "new_feature", label: "New Feature" },
  { id: "improvement", label: "Improvement" },
  { id: "chore", label: "Chore" },
];

// Escalation severities map roughly onto task priority — admin can still
// override either field before submitting.
const SEVERITY_TO_PRIORITY = { critical: "high", high: "high", medium: "medium", low: "low" };

const inp =
  "w-full px-3.5 py-2.5 rounded-xl border border-[rgba(128,128,200,0.2)] bg-[#F8F8FF] text-[13px] text-[#18182E] placeholder-[#C8C8E0] focus:outline-none focus:border-[#80A8FF] focus:bg-white focus:ring-2 focus:ring-[rgba(128,168,255,0.12)] transition-all";

// Turns an escalated ticket into a sprint task the admin has reviewed —
// pre-fills from the AI escalation summary, but every field is editable
// before it's handed to an employee. Reuses the same sprint-planner
// createTask endpoint NewTaskModal uses (via sourceTicketNumber), so both
// paths stay in sync instead of duplicating task-creation logic.
export default function CreateSprintTaskModal({ ticket, onClose, onCreated }) {
  const [sprints, setSprints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sprintId, setSprintId] = useState("");
  const [title, setTitle] = useState(`Escalated: ${ticket.subject}`);
  const [description, setDescription] = useState(ticket.escalation?.summary || ticket.lastMsg || "");
  const [taskType, setTaskType] = useState("bug");
  const [priority, setPriority] = useState(SEVERITY_TO_PRIORITY[ticket.severity] || "medium");
  const [segmentId, setSegmentId] = useState(ticket.escalation?.suggestedSegmentId || "");
  const [assigneeId, setAssigneeId] = useState("");
  const [approximateHours, setApproximateHours] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/sprint-planner/sprints"), api.get("/segments")])
      .then(([sprintsRes, segmentsRes]) => {
        const allSprints = sprintsRes.data?.sprints || [];
        setSprints(allSprints);
        setSegments(segmentsRes.data?.segments || []);
        const defaultSprint = allSprints.find((s) => s.published) || allSprints[0];
        if (defaultSprint) setSprintId(defaultSprint._id);
      })
      .catch(() => setError("Failed to load sprints/teams."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sprintId) {
      setEmployees([]);
      return;
    }
    api
      .get(`/sprint-planner/sprints/${sprintId}/capacity`)
      .then((res) => setEmployees(res.data?.employees || []))
      .catch(() => setEmployees([]));
  }, [sprintId]);

  const assignableEmployees = useMemo(
    () => employees.filter((e) => !segmentId || e.segmentId === segmentId),
    [employees, segmentId],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sprintId) {
      setError("Select a sprint first.");
      return;
    }
    if (!title.trim() || approximateHours === "") {
      setError("Title and approximate hours are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post(`/sprint-planner/sprints/${sprintId}/tasks`, {
        title: title.trim(),
        description: description.trim(),
        taskType,
        priority,
        assigneeId: assigneeId || null,
        segmentId: segmentId || null,
        approximateHours: Number(approximateHours),
        sourceTicketNumber: ticket.id,
      });
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create sprint task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(20,18,50,0.4)] backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[540px] bg-white rounded-2xl shadow-2xl shadow-[rgba(128,168,255,0.1)] border border-[rgba(128,128,200,0.12)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(128,128,200,0.1)]">
          <div>
            <h2 className="text-[15px] font-semibold text-[#18182E]">Create Sprint Task</h2>
            <p className="text-[12px] text-[#9898B8] mt-0.5">From ticket {ticket.id}</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#C0C0D8] hover:bg-[#EEF0FF] hover:text-[#5B5BD6] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mx-6 mt-4 px-3.5 py-2.5 rounded-xl bg-[#FFEEF1] text-[#CC1836] text-[12px] font-medium">
              {error}
            </div>
          )}

          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                Sprint
              </label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className={inp}
                disabled={loading}
              >
                <option value="" disabled>
                  {loading ? "Loading…" : "Select a sprint…"}
                </option>
                {sprints.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.published ? "" : "(unpublished)"}
                  </option>
                ))}
              </select>
              {!loading && sprints.length === 0 && (
                <p className="text-[11px] text-[#CC1836] mt-1">
                  No sprints exist yet — create one in Sprint Planner first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                Title
              </label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inp} resize-none`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                  Type
                </label>
                <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className={inp}>
                  {TASK_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inp}>
                  {["low", "medium", "high"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                  Team
                </label>
                <select
                  value={segmentId}
                  onChange={(e) => {
                    setSegmentId(e.target.value);
                    setAssigneeId("");
                  }}
                  className={inp}
                >
                  <option value="">Any team</option>
                  {segments.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {ticket.escalation?.suggestedTeamName && (
                  <p className="text-[11px] text-[#9898B8] mt-1">
                    AI suggested: {ticket.escalation.suggestedTeamName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                  Approx. hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={approximateHours}
                  onChange={(e) => setApproximateHours(e.target.value)}
                  className={inp}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                Assignee
              </label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inp}>
                <option value="">Unassigned</option>
                {assignableEmployees.map((emp) => (
                  <option key={emp.userId} value={emp.userId}>
                    {emp.name} — {emp.remainingHours}h left
                  </option>
                ))}
              </select>
              {sprintId && assignableEmployees.length === 0 && (
                <p className="text-[11px] text-[#BB5E18] mt-1">No one available in this team/sprint.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-[rgba(128,128,200,0.1)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-semibold text-[#6B6B90] hover:bg-[#F5F5FF] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-4 py-2 text-[13px] font-semibold text-white bg-[#5B5BD6] rounded-xl hover:bg-[#4A4AC0] transition-colors disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
