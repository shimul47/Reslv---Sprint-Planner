import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  TrendingDown,
  User,
  X,
} from "lucide-react";
import {
  CHURN_CFG,
  NOTIF_CFG,
  NOTIFS,
  PLAN_CFG,
  TKT,
} from "../../data/workspaceData.js";
import { Av, StatusBadge } from "./Atoms.jsx";

const NOTIF_ICON = {
  "arrow-right": <ArrowRight size={12} className="text-[#BB5E18]" />,
  clock: <Clock size={12} className="text-[#CC1836]" />,
  "arrow-up-right": (
    <ArrowRight size={12} className="text-[#5B5BD6] rotate-45" />
  ),
  "check-circle": <CheckCircle size={12} className="text-[#228050]" />,
  user: <User size={12} className="text-[#2479B5]" />,
};

function notifIcon(name) {
  return NOTIF_ICON[name] || null;
}

export function CustomerPanel({ cx, tickets = [], onClose }) {
  const churn = CHURN_CFG[cx.churn];
  const plan = PLAN_CFG[cx.plan];
  const rel = tickets.filter((t) => t.customer.id === cx.id).slice(0, 4);

  return (
    <div className="w-[272px] flex-shrink-0 border-l border-[rgba(128,128,200,0.1)] bg-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(128,128,200,0.1)] flex-shrink-0">
        <span className="text-[13px] font-semibold text-[#18182E]">
          Customer Profile
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[#C0C0D8] hover:bg-[#EEF0FF] hover:text-[#5B5BD6] transition-colors"
        >
          <X size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-5 pb-4 border-b border-[rgba(128,128,200,0.08)]">
          <div className="flex items-center gap-3 mb-3">
            <Av initials={cx.initials} hue={cx.hue} size="lg" />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#18182E] leading-tight">
                {cx.name}
              </p>
              <p className="text-[12px] text-[#9898B8]">{cx.company}</p>
            </div>
          </div>
          <div className="space-y-1 mb-3">
            <p className="text-[12px] text-[#A8A8C0] flex items-center gap-1.5">
              <Mail size={11} className="flex-shrink-0" />
              {cx.email}
            </p>
            <p className="text-[12px] text-[#A8A8C0] flex items-center gap-1.5">
              <Phone size={11} className="flex-shrink-0" />
              {cx.phone}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${plan.bg} ${plan.text}`}
            >
              {cx.plan}
            </span>
            <span
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${churn.bg} ${churn.text}`}
            >
              {churn.icon} {churn.label}
            </span>
          </div>
        </div>
        <div className="px-5 py-4 border-b border-[rgba(128,128,200,0.08)]">
          <p className="text-[10px] font-bold text-[#B8B8D0] uppercase tracking-widest mb-3">
            Account
          </p>
          <div className="space-y-2.5">
            {[
              { k: "Annual Revenue", v: cx.arr, em: true },
              { k: "Customer Since", v: cx.since },
              { k: "Total Tickets", v: String(cx.totalTickets) },
              {
                k: "Open Tickets",
                v: String(cx.openTickets),
                warn: cx.openTickets > 1,
              },
            ].map((r) => (
              <div key={r.k} className="flex justify-between items-center">
                <span className="text-[12px] text-[#9898B8]">{r.k}</span>
                <span
                  className={`text-[12px] ${r.em ? "font-semibold text-[#18182E]" : r.warn ? "font-semibold text-[#BB5E18]" : "text-[#18182E]"}`}
                >
                  {r.v}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] text-[#9898B8]">
                Churn Risk Score
              </span>
              <span className={`text-[11px] font-bold ${churn.text}`}>
                {churn.score}/100
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[rgba(128,128,200,0.1)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${cx.churn === "high" ? "bg-[#F26080]" : cx.churn === "medium" ? "bg-[#F5A023]" : "bg-[#3DB870]"}`}
                style={{ width: `${churn.score}%` }}
              />
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-[#B8B8D0] uppercase tracking-widest mb-3">
            Ticket History
          </p>
          <div className="space-y-2">
            {rel.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-[#F8F8FF] border border-[rgba(128,128,200,0.1)]"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-[#B0B0CC]">
                    {t.id}
                  </span>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-[11px] text-[#18182E] leading-snug line-clamp-2">
                  {t.subject}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NewTicketModal({ onClose }) {
  const [f, setF] = useState({
    email: "",
    subject: "",
    sev: "medium",
    ch: "email",
    assignee: "",
    desc: "",
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const inp =
    "w-full px-3.5 py-2.5 rounded-xl border border-[rgba(128,128,200,0.2)] bg-[#F8F8FF] text-[13px] text-[#18182E] placeholder-[#C8C8E0] focus:outline-none focus:border-[#80A8FF] focus:bg-white focus:ring-2 focus:ring-[rgba(128,168,255,0.12)] transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[rgba(20,18,50,0.4)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[540px] bg-white rounded-2xl shadow-2xl shadow-[rgba(128,168,255,0.1)] border border-[rgba(128,128,200,0.12)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(128,128,200,0.1)]">
          <div>
            <h2 className="text-[15px] font-semibold text-[#18182E]">
              Create Ticket
            </h2>
            <p className="text-[12px] text-[#9898B8] mt-0.5">
              Open a ticket on behalf of a customer
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#C0C0D8] hover:bg-[#EEF0FF] hover:text-[#5B5BD6] transition-colors"
          >
            <X size={15} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
              Customer Email
            </label>
            <input
              value={f.email}
              onChange={set("email")}
              placeholder="customer@company.com"
              className={inp}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
              Subject
            </label>
            <input
              value={f.subject}
              onChange={set("subject")}
              placeholder="Brief description of the issue"
              className={inp}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                Severity
              </label>
              <select
                value={f.sev}
                onChange={set("sev")}
                className={`${inp} appearance-none cursor-pointer`}
              >
                {["low", "medium", "high", "critical"].map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                Channel
              </label>
              <select
                value={f.ch}
                onChange={set("ch")}
                className={`${inp} appearance-none cursor-pointer`}
              >
                {["email", "chat", "phone", "web"].map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                Assign To
              </label>
              <select
                value={f.assignee}
                onChange={set("assignee")}
                className={`${inp} appearance-none cursor-pointer`}
              >
                <option value="">Unassigned</option>
                <option>Alex Kim</option>
                <option>Jamie Torres</option>
                <option>Marcus Chen</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={f.desc}
              onChange={set("desc")}
              placeholder="Describe the issue in detail…"
              rows={4}
              className={`${inp} resize-none`}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[rgba(128,128,200,0.08)] bg-[#F8F8FF]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-[#9898B8] hover:text-[#6B6B90] transition-colors"
          >
            Cancel
          </button>
          <button className="px-5 py-2 bg-[#80A8FF] text-white text-[13px] font-semibold rounded-xl hover:bg-[#6B98EE] transition-colors shadow-sm shadow-[rgba(128,168,255,0.25)]">
            Create Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotifDropdown({ onClose }) {
  const unread = NOTIFS.filter((n) => n.unread).length;
  return (
    <div className="absolute top-12 right-0 w-[320px] bg-white rounded-2xl shadow-xl shadow-[rgba(128,128,200,0.12)] border border-[rgba(128,128,200,0.14)] z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[rgba(128,128,200,0.1)]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#18182E]">
            Notifications
          </span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#80A8FF] text-white rounded-full">
              {unread}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[#C0C0D8] hover:text-[#6B6B90] transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[340px]">
        {NOTIFS.map((n) => {
          const cfg = NOTIF_CFG[n.type] || NOTIF_CFG.assign;
          return (
            <div
              key={n.id}
              className={`flex gap-3 px-4 py-3 border-b border-[rgba(128,128,200,0.07)] hover:bg-[#F8F8FF] cursor-pointer transition-colors ${!n.unread ? "opacity-50" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}
              >
                {notifIcon(cfg.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[12px] leading-relaxed ${n.unread ? "text-[#18182E] font-medium" : "text-[#6B6B90]"}`}
                >
                  {n.text}
                </p>
                <p className="text-[11px] text-[#C0C0D8] mt-0.5">{n.time}</p>
              </div>
              {n.unread && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#80A8FF] flex-shrink-0 mt-2" />
              )}
            </div>
          );
        })}
      </div>
      <div className="px-4 py-3 text-center border-t border-[rgba(128,128,200,0.08)]">
        <button className="text-[12px] text-[#80A8FF] hover:text-[#5B8AEE] font-semibold transition-colors">
          Mark all as read
        </button>
      </div>
    </div>
  );
}
