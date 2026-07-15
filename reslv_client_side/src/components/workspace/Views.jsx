import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart2,
  Clock,
  GitMerge,
  Inbox,
  Globe,
  Mail,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  MessageSquare,
  Settings,
  Phone,
  User,
  X,
} from "lucide-react";
import { ESC_STEPS, TKT } from "../../data/workspaceData.js";
import { Av, SLABar, SevBadge, StatusBadge, Tag } from "./Atoms.jsx";
import { Bubble, EscalationStepper, TypingIndicator } from "./Conversation.jsx";
import { CustomerPanel } from "./Overlays.jsx";

function channelIcon(channel) {
  const props = { size: 12 };
  switch (channel) {
    case "email":
      return <Mail {...props} />;
    case "chat":
      return <MessageSquare {...props} />;
    case "phone":
      return <Phone {...props} />;
    case "web":
      return <Globe {...props} />;
    default:
      return null;
  }
}

export function TicketRow({ ticket, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-[rgba(128,128,200,0.08)] transition-all duration-100 border-l-[3px] group ${selected ? "bg-[#EEF0FF] border-l-[#80A8FF]" : "border-l-transparent hover:bg-[#F5F5FF] hover:border-l-[rgba(128,168,255,0.4)]"}`}
    >
      <div className="flex items-start gap-3">
        <Av initials={ticket.customer.initials} hue={ticket.customer.hue} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-[11px] font-mono text-[#B0B0CC]">
              {ticket.id}
            </span>
            <span className="text-[11px] text-[#C0C0D8] flex-shrink-0">
              {ticket.ts}
            </span>
          </div>
          <p
            className={`text-[13px] font-semibold leading-snug mb-1 truncate ${selected ? "text-[#2A2855]" : "text-[#18182E]"}`}
          >
            {ticket.subject}
          </p>
          <p className="text-[12px] text-[#9898B8] truncate mb-2 leading-relaxed">
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

export function StatsBar() {
  const open = TKT.filter((t) => t.status === "open").length;
  const inProg = TKT.filter((t) => t.status === "in-progress").length;
  const escalated = TKT.filter((t) => t.status === "escalated").length;
  const resolved = TKT.filter((t) => t.status === "resolved").length;
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

export function TicketDetail({ ticket, showCX, setShowCX }) {
  const [tab, setTab] = useState("thread");
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    setTab("thread");
    setMsg("");
    endRef.current?.scrollIntoView({ behavior: "instant" });
  }, [ticket.id]);

  useEffect(() => {
    if (tab !== "chat") return;
    const t = setTimeout(() => setTyping(true), 1200);
    return () => clearTimeout(t);
  }, [tab, ticket.id]);

  const tabs = [
    { id: "thread", label: "Thread" },
    { id: "chat", label: "Live Chat" },
    { id: "escalation", label: "Escalation" },
    { id: "notes", label: "Internal Notes" },
  ];
  const btnGhost =
    "px-3 py-1.5 text-[12px] font-semibold text-[#6B6B90] border border-[rgba(128,128,200,0.2)] rounded-xl hover:border-[#80A8FF] hover:text-[#5B5BD6] transition-all";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-6 py-4 border-b border-[rgba(128,128,200,0.1)] bg-white">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <code className="text-[11px] text-[#B0B0CC] font-mono">
                {ticket.id}
              </code>
              <StatusBadge status={ticket.status} />
              <SevBadge sev={ticket.severity} />
              {ticket.slaMins === 0 && ticket.status !== "resolved" && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#CC1836] bg-[#FFEEF1] px-2 py-0.5 rounded-full animate-pulse">
                  <Clock size={10} /> SLA BREACH
                </span>
              )}
            </div>
            <h2 className="text-[15px] font-semibold text-[#18182E] leading-snug">
              {ticket.subject}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 text-[12px] text-[#9898B8] flex-wrap">
              <span className="flex items-center gap-1">
                {channelIcon(ticket.channel)}
                <span className="capitalize">{ticket.channel}</span>
              </span>
              <span className="text-[#D8D8EE]">·</span>
              <span>
                Assigned to{" "}
                <span className="font-semibold text-[#5B5BD6]">
                  {ticket.assignee}
                </span>
              </span>
              {ticket.status !== "resolved" && (
                <>
                  <span className="text-[#D8D8EE]">·</span>
                  <SLABar
                    mins={ticket.slaMins}
                    total={ticket.slaTotal}
                    breached={ticket.slaMins === 0}
                  />
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button className={btnGhost}>
              <GitMerge size={13} />
            </button>
            <button className={btnGhost}>Escalate</button>
            <button className="px-3 py-1.5 text-[12px] font-semibold bg-[#EDFAF2] text-[#228050] rounded-xl hover:bg-[#D5F5E3] transition-colors border border-[rgba(61,184,112,0.18)]">
              Resolve
            </button>
            <button
              onClick={() => setShowCX(!showCX)}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${showCX ? "bg-[#EEF0FF] text-[#5B5BD6]" : "text-[#C0C0D8] hover:bg-[#F0F0FF] hover:text-[#5B5BD6]"}`}
            >
              <User size={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-xl text-[#C0C0D8] hover:bg-[#F0F0FF] hover:text-[#6B6B90] transition-colors">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {ticket.tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-0.5 px-5 py-2 border-b border-[rgba(128,128,200,0.1)] bg-white">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors ${tab === t.id ? "bg-[#EEF0FF] text-[#5B5BD6]" : "text-[#A8A8C0] hover:text-[#6B6B90]"}`}
          >
            {t.label}
            {t.id === "chat" && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-[#3DB870] inline-block" />
            )}
          </button>
        ))}
      </div>

      {tab === "thread" && (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#F7F7FF]">
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
                placeholder="Reply to customer…"
                rows={2}
                className="flex-1 text-[13px] text-[#18182E] bg-transparent placeholder-[#C8C8E0] resize-none focus:outline-none leading-relaxed"
              />
              <div className="flex items-center gap-2 flex-shrink-0 mb-0.5">
                <button className="text-[#C8C8E0] hover:text-[#9898B8] transition-colors">
                  <Paperclip size={14} />
                </button>
                <button
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${msg ? "bg-[#80A8FF] text-white hover:bg-[#6B98EE] shadow-sm" : "bg-[#EEF0FF] text-[#C8C8E0]"}`}
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "chat" && (
        <>
          <div className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 bg-white border-b border-[rgba(128,128,200,0.1)]">
            <Av
              initials={ticket.customer.initials}
              hue={ticket.customer.hue}
              size="sm"
            />
            <div>
              <p className="text-[13px] font-semibold text-[#18182E] leading-none">
                {ticket.customer.name}
              </p>
              <p className="text-[11px] text-[#3DB870] flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3DB870] animate-pulse" />
                Online now
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#F7F7FF]">
            {ticket.thread
              .filter((m) => m.from !== "internal")
              .map((m) => (
                <Bubble key={m.id} msg={m} cx={ticket.customer} />
              ))}
            {typing && <TypingIndicator name={ticket.customer.name} />}
            <div ref={endRef} />
          </div>
          <div className="flex-shrink-0 px-4 py-3 border-t border-[rgba(128,128,200,0.1)] bg-white">
            <div className="flex items-end gap-2 bg-[#F7F7FF] rounded-2xl border border-[rgba(128,128,200,0.16)] px-4 py-3 focus-within:border-[#80A8FF] focus-within:ring-2 focus-within:ring-[rgba(128,168,255,0.1)] transition-all">
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Message the customer directly…"
                rows={2}
                className="flex-1 text-[13px] text-[#18182E] bg-transparent placeholder-[#C8C8E0] resize-none focus:outline-none leading-relaxed"
              />
              <div className="flex items-center gap-2 flex-shrink-0 mb-0.5">
                <button className="text-[#C8C8E0] hover:text-[#9898B8] transition-colors">
                  <Paperclip size={14} />
                </button>
                <button
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
          <div className="bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] p-6 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-[14px] font-semibold text-[#18182E]">
                  Escalation Pipeline
                </h3>
                <p className="text-[12px] text-[#9898B8] mt-0.5">
                  {ticket.escalationStep === 0
                    ? "No active escalation"
                    : `Step ${ticket.escalationStep + 1} of 4 — ${ESC_STEPS[ticket.escalationStep].role}`}
                </p>
              </div>
              {ticket.escalationStep > 0 && (
                <span className="text-[11px] px-2.5 py-1 bg-[#FFF2E5] text-[#BB5E18] rounded-full font-bold">
                  Active
                </span>
              )}
            </div>
            <EscalationStepper step={ticket.escalationStep} />
          </div>
          {ticket.escalationStep > 0 && (
            <div className="bg-white rounded-2xl border border-[rgba(245,160,35,0.16)] p-4 shadow-sm">
              <p className="text-[11px] font-bold text-[#A06618] uppercase tracking-wider mb-2">
                Escalation Reason
              </p>
              <p className="text-[13px] text-[#6B6B90] leading-relaxed">
                SLA breach risk — webhook delivery failure affecting billing
                pipeline for a high-value enterprise customer (
                {ticket.customer.arr}). Infrastructure team has been notified
                and is investigating a potential Redis saturation event on the
                webhook worker queue.
              </p>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] p-4 shadow-sm">
            <p className="text-[11px] font-bold text-[#B8B8D0] uppercase tracking-wider mb-3">
              Escalate Further
            </p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 text-[13px] font-semibold text-[#5B5BD6] bg-[#EEF0FF] rounded-xl hover:bg-[#E4E6FF] transition-colors">
                Escalate to Admin
              </button>
              <button className="flex-1 py-2 text-[13px] font-semibold text-[#6B6B90] border border-[rgba(128,128,200,0.2)] rounded-xl hover:border-[#80A8FF] hover:text-[#5B5BD6] transition-all">
                Assign Member
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "notes" && (
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#F7F7FF]">
          <div className="bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] p-4 mb-4 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2.5">
              <Av initials="AK" hue={252} size="sm" />
              <div>
                <p className="text-[12px] font-semibold text-[#18182E]">
                  Alex Kim
                </p>
                <p className="text-[11px] text-[#C0C0D8]">10:31 AM · Today</p>
              </div>
            </div>
            <p className="text-[13px] text-[#18182E] leading-relaxed">
              Webhook queue showing ~92% error rate. Spoke with infra —
              potential Redis saturation on the worker. Escalating to Marcus for
              direct intervention. Customer is high-value ({ticket.customer.arr}
              ) and high churn risk — treat as P0.
            </p>
          </div>
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
              <button className="px-4 py-1.5 bg-[#CEB5FF] text-[#3D3060] text-[12px] font-semibold rounded-lg hover:bg-[#BEA5EE] transition-colors">
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function InboxView() {
  const [selectedId, setSelectedId] = useState(TKT[0].id);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [channelF, setChannelF] = useState("all");
  const [showCX, setShowCX] = useState(false);

  const filtered = TKT.filter((t) => {
    const q = search.toLowerCase();
    const mq =
      !q ||
      t.subject.toLowerCase().includes(q) ||
      t.customer.name.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q);
    const ms = statusF === "all" || t.status === statusF;
    const mc = channelF === "all" || t.channel === channelF;
    return mq && ms && mc;
  });
  const selected = TKT.find((t) => t.id === selectedId);

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="w-[300px] flex-shrink-0 border-r border-[rgba(128,128,200,0.1)] flex flex-col bg-white overflow-hidden">
        <div className="px-3 pt-3 pb-2 space-y-2 border-b border-[rgba(128,128,200,0.08)]">
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
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {["all", "open", "in-progress", "escalated", "resolved"].map(
              (s) => (
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
              ),
            )}
          </div>
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
                No tickets match
              </p>
              <p className="text-[12px] text-[#C0C0D8] mt-1">
                Try adjusting your search or filters
              </p>
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
            />
          </div>
          {showCX && (
            <CustomerPanel
              cx={selected.customer}
              onClose={() => setShowCX(false)}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-[#F7F7FF]">
          <div className="w-16 h-16 rounded-2xl bg-[#EEF0FF] flex items-center justify-center mb-4">
            <Inbox size={26} className="text-[#CEB5FF]" />
          </div>
          <p className="text-[14px] font-semibold text-[#18182E]">
            Select a ticket
          </p>
          <p className="text-[13px] text-[#9898B8] mt-1 max-w-[220px] leading-relaxed">
            Choose a ticket from the list to view the full conversation.
          </p>
        </div>
      )}
    </div>
  );
}

export function EscalationsView() {
  const escalated = TKT.filter((t) => t.status === "escalated");
  const all = TKT.filter(
    (t) => t.escalationStep > 0 || t.status === "escalated",
  );
  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      <div className="mb-6">
        <h1 className="text-[18px] font-semibold text-[#18182E]">
          Escalation Pipeline
        </h1>
        <p className="text-[13px] text-[#9898B8] mt-1">
          {escalated.length} active · tracking Agent → Admin → Team Lead →
          Member
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {ESC_STEPS.map((step, i) => {
          const count = all.filter((t) => t.escalationStep === i).length;
          return (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-full bg-[#EEF0FF] flex items-center justify-center text-[11px] font-bold text-[#5B5BD6]">
                  {i + 1}
                </div>
                <span className="text-[11px] font-bold text-[#B0B0CC]">
                  {count} ticket{count !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-[13px] font-semibold text-[#18182E]">
                {step.role}
              </p>
              <p className="text-[11px] text-[#A8A8C0] mt-0.5">{step.name}</p>
            </div>
          );
        })}
      </div>
      {escalated.map((ticket) => (
        <div
          key={ticket.id}
          className="bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] shadow-sm mb-5 overflow-hidden"
        >
          <div className="flex items-start justify-between px-6 py-4 border-b border-[rgba(128,128,200,0.08)]">
            <div className="flex items-start gap-3">
              <Av
                initials={ticket.customer.initials}
                hue={ticket.customer.hue}
              />
              <div>
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <code className="text-[11px] text-[#B0B0CC] font-mono">
                    {ticket.id}
                  </code>
                  <StatusBadge status={ticket.status} />
                  <SevBadge sev={ticket.severity} />
                  {ticket.slaMins === 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#CC1836] bg-[#FFEEF1] px-2 py-0.5 rounded-full">
                      <Clock size={10} /> SLA BREACH
                    </span>
                  )}
                </div>
                <p className="text-[14px] font-semibold text-[#18182E]">
                  {ticket.subject}
                </p>
                <p className="text-[12px] text-[#9898B8] mt-0.5">
                  {ticket.customer.company} · {ticket.customer.name} ·{" "}
                  {ticket.customer.arr}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[12px] font-semibold text-[#6B6B90]">
                {ticket.assignee}
              </p>
              <SLABar
                mins={ticket.slaMins}
                total={ticket.slaTotal}
                breached={ticket.slaMins === 0}
              />
            </div>
          </div>
          <div className="px-6 py-5">
            <EscalationStepper step={ticket.escalationStep} />
          </div>
        </div>
      ))}
      {escalated.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#EDFAF2] flex items-center justify-center mb-4">
            <CheckCircle size={28} className="text-[#3DB870]" />
          </div>
          <p className="text-[15px] font-semibold text-[#18182E]">All clear</p>
          <p className="text-[13px] text-[#9898B8] mt-1">
            No active escalations at the moment.
          </p>
        </div>
      )}
    </div>
  );
}
