import { useContext, useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart2,
  CheckCircle,
  Inbox,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Settings,
  User,
  X,
} from "lucide-react";
import { TKT } from "../../data/workspaceData.js";
import { Av, SLABar, SevBadge, StatusBadge, channelIcon } from "./Atoms.jsx";
import { Bubble } from "./Conversation.jsx";
import { CustomerPanel } from "./Overlays.jsx";
import CreateSprintTaskModal from "./CreateSprintTaskModal.jsx";
import api from "../../api/axios.js";
import { io } from "socket.io-client";
import { AuthContext } from "../../context/AuthContext.jsx";

export function TicketRow({ ticket, selected, onClick }) {
  const hasUnread = (ticket.unreadCount || 0) > 0;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-[rgba(128,128,200,0.08)] transition-all duration-100 border-l-[3px] group ${selected ? "bg-[#EEF0FF] border-l-[#80A8FF]" : "border-l-transparent hover:bg-[#F5F5FF] hover:border-l-[rgba(128,168,255,0.4)]"}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <Av initials={ticket.customer.initials} hue={ticket.customer.hue} />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#5B5BD6] ring-2 ring-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span
              className={`text-[11px] font-mono ${hasUnread ? "text-[#6B6B90] font-bold" : "text-[#B0B0CC]"}`}
            >
              {ticket.id}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {hasUnread && (
                <span className="text-[10px] font-bold text-white bg-[#5B5BD6] rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center leading-none">
                  {ticket.unreadCount}
                </span>
              )}
              <span className="text-[11px] text-[#C0C0D8]">{ticket.ts}</span>
            </div>
          </div>
          <p
            className={`text-[13px] leading-snug mb-1 truncate ${hasUnread ? "font-bold" : "font-semibold"} ${selected ? "text-[#2A2855]" : "text-[#18182E]"}`}
          >
            {ticket.subject}
          </p>
          <p
            className={`text-[12px] truncate mb-2 leading-relaxed ${hasUnread ? "text-[#4A4A6A] font-semibold" : "text-[#9898B8]"}`}
          >
            {ticket.lastMsg}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={ticket.status} />
            <SevBadge sev={ticket.severity} />
            <span className="text-[#CCCCDD]">·</span>
            <span
              className={`flex items-center gap-1 text-[#B0B0CC] ${selected ? "text-[#8080B8]" : ""}`}
            >
              {channelIcon(ticket.channel)}
              <span className="text-[11px] capitalize">{ticket.channel}</span>
            </span>
            <div className="ml-auto">
              <SLABar
                mins={ticket.slaMins}
                total={ticket.slaTotal}
                breached={ticket.slaMins === 0 && ticket.status !== "resolved"}
              />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export function StatsBar({ tickets = TKT }) {
  const open = tickets.filter((t) => t.status === "open").length;
  const inProg = tickets.filter((t) => t.status === "in-progress").length;
  const escalated = tickets.filter((t) => t.status === "escalated").length;
  const resolved = tickets.filter((t) => t.status === "resolved").length;
  const stats = [
    {
      label: "Open",
      value: open,
      color: "bg-[#EEF0FF]",
      text: "text-[#5B5BD6]",
      dot: "bg-[#80A8FF]",
    },
    {
      label: "In Progress",
      value: inProg,
      color: "bg-[#E7F4FD]",
      text: "text-[#2479B5]",
      dot: "bg-[#8EC1DE]",
    },
    {
      label: "Escalated",
      value: escalated,
      color: "bg-[#FFF2E5]",
      text: "text-[#BB5E18]",
      dot: "bg-[#F5A023]",
    },
    {
      label: "Resolved",
      value: resolved,
      color: "bg-[#EDFAF2]",
      text: "text-[#228050]",
      dot: "bg-[#3DB870]",
    },
  ];

  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-[rgba(128,128,200,0.1)] bg-white flex-shrink-0">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${s.color}`}
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
          <span className={`text-[12px] font-semibold ${s.text}`}>
            {s.value}
          </span>
          <span className="text-[11px] text-[#9898B8]">{s.label}</span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[#9898B8]">
        <Activity size={12} className="text-[#CEB5FF]" />
        Avg. response:
        <span className="font-semibold text-[#18182E]">18 min</span>
      </div>
    </div>
  );
}

export function TicketDetail({
  ticket,
  showCX,
  setShowCX,
  onSendMessage,
  onEscalate,
  onResolve,
  onReopen,
  onSaveNote,
  onAssign,
  onRefresh,
}) {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState("thread");
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [agents, setAgents] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    api
      .get("/tickets/team/agents")
      .then((res) => setAgents(res.data?.agents || []))
      .catch(() => setAgents([]));
  }, []);

  const isResolved = ticket.status === "resolved";
  const internalNotes = ticket.thread.filter((m) => m.from === "internal");
  const isAdmin =
    user?.roles?.some((r) => ["admin", "superadmin"].includes(r)) ?? false;
  const canManageAssignment =
    !ticket.assignedTo ||
    String(ticket.assignedTo) === String(user?.id) ||
    isAdmin;

  useEffect(() => {
    setTab("thread");
    setMsg("");
    endRef.current?.scrollIntoView({ behavior: "instant" });
  }, [ticket.id]);

  // Keep the thread pinned to the latest message as new ones arrive (sent or received).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket.thread.length, tab]);

  const tabs = [
    { id: "thread", label: "Thread" },
    { id: "escalation", label: "Escalation" },
    { id: "notes", label: "Internal Notes" },
  ];

  const handleSend = async () => {
    const text = msg.trim();
    if (!text || !onSendMessage) return;
    setMsg(""); // clear immediately — don't wait on the round trip to feel responsive
    await onSendMessage(ticket.id, text);
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-6 py-2.5 border-b border-[rgba(128,128,200,0.1)] bg-white">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-[#18182E] leading-snug">
              {ticket.subject}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 relative">
            {isResolved ? (
              <button
                onClick={() => onReopen?.(ticket.id)}
                className="px-3 py-1.5 text-[12px] font-semibold bg-[#EEF0FF] text-[#5B5BD6] rounded-xl hover:bg-[#E4E6FF] transition-colors border border-[rgba(128,128,200,0.18)]"
              >
                Reopen
              </button>
            ) : (
              <button
                onClick={() => onResolve?.(ticket.id)}
                className="px-3 py-1.5 text-[12px] font-semibold bg-[#EDFAF2] text-[#228050] rounded-xl hover:bg-[#D5F5E3] transition-colors border border-[rgba(61,184,112,0.18)]"
              >
                Resolve
              </button>
            )}
            <button
              onClick={() => setShowCX(!showCX)}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${showCX ? "bg-[#EEF0FF] text-[#5B5BD6]" : "text-[#C0C0D8] hover:bg-[#F0F0FF] hover:text-[#5B5BD6]"}`}
            >
              <User size={14} />
            </button>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-[#C0C0D8] hover:bg-[#F0F0FF] hover:text-[#6B6B90] transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <div className="absolute top-9 right-0 w-44 bg-white rounded-xl shadow-lg border border-[rgba(128,128,200,0.14)] z-20 overflow-hidden">
                {ticket.assignedTo && canManageAssignment && (
                  <button
                    onClick={() => {
                      onAssign?.(ticket.id, null);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-[12px] font-medium text-[#6B6B90] hover:bg-[#F5F5FF] transition-colors"
                  >
                    Unassign ticket
                  </button>
                )}
                {!ticket.assignedTo && (
                  <p className="px-3.5 py-2.5 text-[12px] text-[#C0C0D8]">
                    Unassigned — awaiting first reply
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-0.5 px-5 py-1.5 border-b border-[rgba(128,128,200,0.1)] bg-white">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors ${tab === t.id ? "bg-[#EEF0FF] text-[#5B5BD6]" : "text-[#A8A8C0] hover:text-[#6B6B90]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "thread" && (
        <>
          <div className="flex-1 overflow-y-auto px-8 py-6 bg-[#F7F7FF]">
            {ticket.thread.map((m) => (
              <Bubble key={m.id} msg={m} cx={ticket.customer} />
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex-shrink-0 px-4 py-3 border-t border-[rgba(128,128,200,0.1)] bg-white">
            <div className="flex items-end gap-2 bg-[#F7F7FF] rounded-2xl border border-[rgba(128,128,200,0.16)] px-4 py-3 focus-within:border-[#80A8FF] focus-within:ring-2 focus-within:ring-[rgba(128,168,255,0.1)] transition-all">
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Reply to customer"
                rows={2}
                className="flex-1 text-[13px] text-[#18182E] bg-transparent placeholder-[#C8C8E0] resize-none focus:outline-none leading-relaxed"
              />
              <div className="flex items-center gap-2 flex-shrink-0 mb-0.5">
                <button className="text-[#C8C8E0] hover:text-[#9898B8] transition-colors">
                  <Paperclip size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${msg ? "bg-[#80A8FF] text-white hover:bg-[#6B98EE] shadow-sm" : "bg-[#EEF0FF] text-[#C8C8E0]"}`}
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "escalation" && (
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#F7F7FF] space-y-4">
          {ticket.status === "escalated" && (
            <div className="bg-white rounded-2xl border border-[rgba(245,160,35,0.16)] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-[#A06618] uppercase tracking-wider">
                  Escalation Reason
                </p>
                {ticket.escalation?.suggestedTeamName && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EEF0FF] text-[#5B5BD6] rounded-full">
                    Suggested team: {ticket.escalation.suggestedTeamName}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#6B6B90] leading-relaxed">
                {ticket.escalation?.summary ||
                  "AI summary not available yet — escalate the ticket to generate one."}
              </p>
            </div>
          )}
          {isAdmin && ticket.status === "escalated" && (
            <SprintTaskCard
              ticket={ticket}
              onResolve={onResolve}
              onRefresh={onRefresh}
            />
          )}
          <div className="bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] p-4 shadow-sm">
            <p className="text-[11px] font-bold text-[#B8B8D0] uppercase tracking-wider mb-3">
              Escalate Further
            </p>
            <div className="flex gap-2">
              <button
                disabled={isResolved || !ticket.assignedTo}
                title={
                  !ticket.assignedTo
                    ? "Assign the ticket to an agent before escalating"
                    : undefined
                }
                onClick={() => onEscalate?.(ticket.id)}
                className="flex-1 py-2 text-[13px] font-semibold text-[#5B5BD6] bg-[#EEF0FF] rounded-xl hover:bg-[#E4E6FF] transition-colors disabled:opacity-50"
              >
                Escalate to Admin
              </button>
              <button
                onClick={() => setShowAssignPicker((v) => !v)}
                className="flex-1 py-2 text-[13px] font-semibold text-[#6B6B90] border border-[rgba(128,128,200,0.2)] rounded-xl hover:border-[#80A8FF] hover:text-[#5B5BD6] transition-all"
              >
                Assign Member
              </button>
            </div>
            {showAssignPicker && (
              <select
                defaultValue=""
                onChange={async (e) => {
                  if (!e.target.value) return;
                  await onAssign?.(ticket.id, e.target.value);
                  setShowAssignPicker(false);
                }}
                className="mt-3 w-full px-3 py-2 rounded-xl border border-[rgba(128,128,200,0.2)] bg-[#F8F8FF] text-[13px] text-[#18182E] cursor-pointer focus:outline-none"
              >
                <option value="" disabled>
                  Select an agent…
                </option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {tab === "notes" && (
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#F7F7FF]">
          {internalNotes.length === 0 && (
            <p className="text-[13px] text-[#B0B0CC] text-center py-6">
              No internal notes yet.
            </p>
          )}
          {internalNotes.map((n) => (
            <div
              key={n.id}
              className="bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] p-4 mb-4 shadow-sm"
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <Av
                  initials={(n.agent || "S").slice(0, 2).toUpperCase()}
                  hue={252}
                  size="sm"
                />
                <div>
                  <p className="text-[12px] font-semibold text-[#18182E]">
                    {n.agent || "Support"}
                  </p>
                  <p className="text-[11px] text-[#C0C0D8]">{n.time}</p>
                </div>
              </div>
              <p className="text-[13px] text-[#18182E] leading-relaxed">
                {n.text}
              </p>
            </div>
          ))}
          <div className="bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] px-4 py-4 shadow-sm">
            <p className="text-[11px] font-bold text-[#B8B8D0] uppercase tracking-wider mb-3">
              Add Note
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Internal note — not visible to customer…"
              rows={3}
              className="w-full text-[13px] text-[#18182E] bg-transparent placeholder-[#C8C8E0] resize-none focus:outline-none leading-relaxed"
            />
            <div className="flex justify-end pt-2 border-t border-[rgba(128,128,200,0.08)] mt-2">
              <button
                onClick={async () => {
                  if (!note.trim() || !onSaveNote) return;
                  await onSaveNote(ticket.id, note.trim());
                  setNote("");
                }}
                className="px-4 py-1.5 bg-[#CEB5FF] text-[#3D3060] text-[12px] font-semibold rounded-lg hover:bg-[#BEA5EE] transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Admin-only card in the escalation tab: walks the ticket through
// "no sprint task yet" -> "with employee" -> "done, ready to resolve".
// Ticket lifecycle state here is derived from linkedTask/escalation fields
// rather than a new ticket status, so nothing else about the ticket model
// changes.
function SprintTaskCard({ ticket, onResolve, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const task = ticket.linkedTask;

  return (
    <div className="bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] p-4 shadow-sm">
      <p className="text-[11px] font-bold text-[#B8B8D0] uppercase tracking-wider mb-3">
        Sprint Task
      </p>

      {!task && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-2 text-[13px] font-semibold text-[#5B5BD6] bg-[#EEF0FF] rounded-xl hover:bg-[#E4E6FF] transition-colors"
        >
          Create Sprint Task
        </button>
      )}

      {task && task.status !== "done" && (
        <p className="text-[13px] text-[#6B6B90] leading-relaxed">
          In progress — assigned to{" "}
          <span className="font-semibold text-[#18182E]">
            {task.assigneeName || "Unassigned"}
          </span>
          .
        </p>
      )}

      {task && task.status === "done" && (
        <div className="space-y-3">
          <p className="text-[13px] text-[#6B6B90] leading-relaxed">
            {ticket.escalation?.completionSummary ||
              "The linked sprint task has been marked done."}
          </p>
          <button
            onClick={() => onResolve?.(ticket.id)}
            className="w-full py-2 text-[13px] font-semibold text-[#228050] bg-[#EDFAF2] rounded-xl hover:bg-[#D5F5E3] transition-colors"
          >
            Mark Resolved
          </button>
        </div>
      )}

      {showModal && (
        <CreateSprintTaskModal
          ticket={ticket}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}

export function useTicketFeed(selectedTicketId) {
  const { user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]); // Initialized as completely empty

  const refreshTickets = async () => {
    try {
      const response = await api.get("/tickets");
      // Fallbacks handle variations in how your API might wrap the data
      const data = response.data?.tickets || response.data || [];
      setTickets(data);
    } catch (error) {
      console.error("Unable to refresh tickets:", error);
    }
  };

  useEffect(() => {
    if (!user?.companyId) return;

    // Fetch initial tickets
    refreshTickets();

    // Establish Socket.io connection
    const socket = io(import.meta.env.VITE_WS_URL || "http://localhost:5000", {
      transports: ["websocket"],
    });

    // Join company room for general updates
    socket.emit("company:join", user.companyId);

    // Join specific ticket room for live chat typing/messages
    if (selectedTicketId) {
      socket.emit("ticket:join", selectedTicketId);
    }

    // Whole-ticket-shape changes (status/severity/assignment/escalation) are
    // low-frequency, so a full refetch is simplest and cheap.
    const sync = () => refreshTickets();
    socket.on("ticket:created", sync);
    socket.on("ticket:updated", sync);

    // Chat messages are the hot path — append the pushed payload directly
    // instead of refetching the whole ticket list for instant delivery.
    socket.on("ticket:message", ({ ticketNumber, message }) => {
      setTickets((prev) => {
        const idx = prev.findIndex((t) => t.id === ticketNumber);
        if (idx === -1) return prev;
        // A ticket that's currently open counts as read as soon as it
        // arrives; otherwise it bolds and its unread badge ticks up.
        const isOpenNow = ticketNumber === selectedTicketId;
        const bumpsUnread = message.from === "customer" && !isOpenNow;
        const updated = {
          ...prev[idx],
          thread: [...prev[idx].thread, message],
          lastMsg: message.text,
          unreadCount: bumpsUnread
            ? (prev[idx].unreadCount || 0) + 1
            : prev[idx].unreadCount,
        };
        // Move it to the top, same as the backend's most-recent-activity sort.
        const next = prev.slice();
        next.splice(idx, 1);
        next.unshift(updated);
        return next;
      });
    });

    // Reconciliation safety net: catch up on anything missed while disconnected.
    socket.on("connect", refreshTickets);

    return () => socket.disconnect();
  }, [user?.companyId, selectedTicketId]);

  return { tickets, refreshTickets };
}

export function InboxView({ mode = "active" }) {
  const isResolvedMode = mode === "resolved";
  const { user } = useContext(AuthContext);
  const isAdmin =
    user?.roles?.some((r) => ["admin", "superadmin"].includes(r)) ?? false;
  const [selectedId, setSelectedId] = useState(null);
  const { tickets, refreshTickets } = useTicketFeed(selectedId);

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [channelF, setChannelF] = useState("all");
  const [showCX, setShowCX] = useState(false);
  // Admin-only: default the inbox down to tickets an agent has escalated,
  // instead of every ticket in the company — off (escalated-only) by
  // default, remembered per admin across sessions on this browser.
  const showAllKey = user?.id ? `escalationInboxShowAll:${user.id}` : null;
  const [showAllForAdmin, setShowAllForAdmin] = useState(false);
  // user loads asynchronously after mount, so re-read the persisted
  // preference once we actually know which admin this is.
  useEffect(() => {
    if (!showAllKey) return;
    try {
      setShowAllForAdmin(localStorage.getItem(showAllKey) === "true");
    } catch {
      // localStorage unavailable — falls back to the default (off).
    }
  }, [showAllKey]);
  const toggleShowAllForAdmin = () => {
    setShowAllForAdmin((prev) => {
      const next = !prev;
      if (showAllKey) {
        try {
          localStorage.setItem(showAllKey, String(next));
        } catch {
          // localStorage unavailable (private browsing, etc.) — toggle still
          // works for this session, it just won't persist.
        }
      }
      return next;
    });
  };
  const escalationFilterActive = isAdmin && !isResolvedMode && !showAllForAdmin;

  // Opening a ticket clears its unread badge/bold state, Facebook-style.
  // The call is cheap and idempotent (no-op server-side once already read).
  useEffect(() => {
    if (!selectedId) return;
    api
      .patch(`/tickets/${selectedId}/read`)
      .then(() => refreshTickets())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Resolved tickets have their own dedicated section — the active inbox
  // never shows them, regardless of the status filter chosen there.
  const scoped = tickets.filter((t) => {
    if (isResolvedMode) return t.status === "resolved";
    if (escalationFilterActive)
      return t.status === "escalated" && Boolean(t.assignedTo);
    return t.status !== "resolved";
  });

  // Filter directly from the dynamic tickets array
  const filtered = scoped.filter((t) => {
    const q = search.toLowerCase();
    // Optional chaining prevents crashes if backend data is missing fields
    const mq =
      !q ||
      t.subject?.toLowerCase().includes(q) ||
      t.customer?.name?.toLowerCase().includes(q) ||
      t.id?.toLowerCase().includes(q);
    const ms = statusF === "all" || t.status === statusF;
    const mc = channelF === "all" || t.channel === channelF;
    return mq && ms && mc;
  });

  const selected = tickets.find((t) => t.id === selectedId);

  const handleSendMessage = async (ticketId, text) => {
    try {
      await api.post(`/tickets/${ticketId}/messages`, { text });
      await refreshTickets();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleEscalate = async (ticketId) => {
    try {
      await api.patch(`/tickets/${ticketId}/escalate`);
      await refreshTickets();
    } catch (error) {
      console.error("Failed to escalate ticket:", error);
    }
  };

  const handleResolve = async (ticketId) => {
    try {
      await api.patch(`/tickets/${ticketId}/resolve`);
      await refreshTickets();
    } catch (error) {
      console.error("Failed to resolve ticket:", error);
    }
  };

  const handleReopen = async (ticketId) => {
    try {
      await api.patch(`/tickets/${ticketId}`, { status: "open" });
      await refreshTickets();
    } catch (error) {
      console.error("Failed to reopen ticket:", error);
    }
  };

  const handlePriorityChange = async (ticketId, severity) => {
    try {
      await api.patch(`/tickets/${ticketId}`, { severity });
      await refreshTickets();
    } catch (error) {
      console.error("Failed to change priority:", error);
    }
  };

  const handleSaveNote = async (ticketId, text) => {
    try {
      await api.post(`/tickets/${ticketId}/notes`, { text });
      await refreshTickets();
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  };

  const handleAssign = async (ticketId, assigneeId) => {
    try {
      await api.patch(`/tickets/${ticketId}/assign`, {
        assigneeId: assigneeId || null,
      });
      await refreshTickets();
    } catch (error) {
      console.error("Failed to update assignment:", error);
    }
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="w-[300px] flex-shrink-0 border-r border-[rgba(128,128,200,0.1)] flex flex-col bg-white overflow-hidden">
        <div className="px-3 pt-3 pb-2 space-y-2 border-b border-[rgba(128,128,200,0.08)]">
          {isAdmin && !isResolvedMode && (
            <button
              onClick={toggleShowAllForAdmin}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#F7F7FF] border border-[rgba(128,128,200,0.14)]"
            >
              <span className="text-[11px] font-semibold text-[#6B6B90]">
                {showAllForAdmin
                  ? "Showing all tickets"
                  : "Showing escalated tickets only"}
              </span>

              <span
                className={`relative w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${
                  showAllForAdmin ? "bg-[#5B5BD6]" : "bg-[#D8D8EE]"
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all duration-200 ${
                    showAllForAdmin ? "left-[16px]" : "left-[2px]"
                  }`}
                />
              </span>
            </button>
          )}
          <div className="flex items-center gap-2 bg-[#F7F7FF] rounded-xl px-3 py-2 border border-[rgba(128,128,200,0.14)]">
            <Search size={13} className="text-[#C8C8E0] flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets…"
              className="flex-1 text-[12px] bg-transparent text-[#18182E] placeholder-[#C8C8E0] focus:outline-none min-w-0"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[#C8C8E0] hover:text-[#9898B8]"
              >
                <X size={11} />
              </button>
            )}
          </div>
          {!isResolvedMode && (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
              {["all", "open", "in-progress", "escalated"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusF(s)}
                  className={`flex-shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${statusF === s ? "bg-[#EEF0FF] text-[#5B5BD6]" : "text-[#A8A8C0] hover:bg-[#F0F0FF]"}`}
                >
                  {s === "all"
                    ? "All"
                    : s === "in-progress"
                      ? "In Progress"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {["all", "email", "chat", "phone", "web"].map((c) => (
              <button
                key={c}
                onClick={() => setChannelF(c)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${channelF === c ? "bg-[#E7F4FD] text-[#2479B5]" : "text-[#A8A8C0] hover:bg-[#F0F8FF]"}`}
              >
                {c !== "all" && channelIcon(c)}
                {c === "all"
                  ? "All channels"
                  : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2 flex-shrink-0">
          <span className="text-[10px] font-bold text-[#C8C8E0] uppercase tracking-widest">
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((t) => (
            <TicketRow
              key={t.id}
              ticket={t}
              selected={selectedId === t.id}
              onClick={() => setSelectedId(t.id)}
            />
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF0FF] flex items-center justify-center mb-3">
                <Search size={20} className="text-[#D3D3FF]" />
              </div>
              <p className="text-[13px] font-semibold text-[#6B6B90]">
                {scoped.length === 0
                  ? isResolvedMode
                    ? "No resolved tickets yet"
                    : escalationFilterActive
                      ? "No escalated tickets"
                      : "No tickets yet"
                  : "No tickets match"}
              </p>
              <p className="text-[12px] text-[#C0C0D8] mt-1">
                {scoped.length === 0
                  ? isResolvedMode
                    ? "Tickets marked resolved will show up here."
                    : escalationFilterActive
                      ? "Tickets an agent escalates to admin will show up here. Toggle above to see all tickets."
                      : "When customers reach out, they will appear here."
                  : "Try adjusting your search or filters"}
              </p>
              {scoped.length > 0 && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusF("all");
                    setChannelF("all");
                  }}
                  className="mt-3 text-[12px] text-[#80A8FF] font-semibold hover:text-[#5B8AEE] transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {selected ? (
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <TicketDetail
              ticket={selected}
              showCX={showCX}
              setShowCX={setShowCX}
              onSendMessage={handleSendMessage}
              onEscalate={handleEscalate}
              onResolve={handleResolve}
              onReopen={handleReopen}
              onSaveNote={handleSaveNote}
              onAssign={handleAssign}
              onRefresh={refreshTickets}
            />
          </div>
          {showCX && (
            <CustomerPanel
              cx={selected.customer}
              ticket={selected}
              tickets={tickets}
              onClose={() => setShowCX(false)}
              onPriorityChange={handlePriorityChange}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-[#F7F7FF]">
          <div className="w-16 h-16 rounded-2xl bg-[#EEF0FF] flex items-center justify-center mb-4">
            {isResolvedMode ? (
              <CheckCircle size={26} className="text-[#3DB870]" />
            ) : (
              <Inbox size={26} className="text-[#CEB5FF]" />
            )}
          </div>
          <p className="text-[14px] font-semibold text-[#18182E]">
            {scoped.length === 0
              ? isResolvedMode
                ? "No resolved tickets"
                : escalationFilterActive
                  ? "No escalated tickets"
                  : "Your inbox is empty"
              : "Select a ticket"}
          </p>
          <p className="text-[13px] text-[#9898B8] mt-1 max-w-[220px] leading-relaxed">
            {scoped.length === 0
              ? isResolvedMode
                ? "Resolved conversations will show up here for reference."
                : escalationFilterActive
                  ? "Tickets an agent escalates to admin will show up here."
                  : "You're all caught up! New inquiries will appear automatically."
              : "Choose a ticket from the list to view the full conversation."}
          </p>
        </div>
      )}
    </div>
  );
}

export function ResolvedView() {
  return <InboxView mode="resolved" />;
}
