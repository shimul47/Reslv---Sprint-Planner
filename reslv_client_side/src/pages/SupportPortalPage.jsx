import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import ChatWidget from "../components/chatbot/ChatWidget.jsx";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const WS_ROOT = import.meta.env.VITE_WS_URL || "http://localhost:5000";

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Helper to retrieve exact MongoDB _id or ticket number
const getTicketId = (ticket) =>
  ticket?._id || ticket?.ticketNumber || ticket?.id;

function initialsOf(name) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const STATUS_STYLES = {
  open: "bg-cyan-500/20 text-cyan-300",
  "in-progress": "bg-blue-500/20 text-blue-300",
  escalated: "bg-amber-500/20 text-amber-300",
  resolved: "bg-emerald-500/20 text-emerald-300",
};

function statusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.open;
}

function TicketFeedback({ ticketId, companyCode, token }) {
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API_ROOT}/public/support/${companyCode}/tickets/${ticketId}/feedback`, {
      headers: authHeaders(token)
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.feedback) {
          setExisting(data.feedback);
          setRating(data.feedback.rating || 0);
          setComment(data.feedback.comment || "");
        } else {
          setExisting(null);
          setRating(0);
          setComment("");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticketId, companyCode, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_ROOT}/public/support/${companyCode}/tickets/${ticketId}/feedback`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ rating, comment })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to submit feedback");
      }
      const data = await res.json();
      setExisting(data.feedback);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (existing && !isEditing) {
    return (
      <div className="flex-shrink-0 p-6 bg-[#0B0C10] border-t border-white/10 text-center animate-in fade-in duration-300">
        <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            ✓ Feedback Submitted
          </div>
          <h4 className="text-white font-semibold text-base mb-2">Thank you for your review!</h4>
          <div className="flex justify-center gap-1.5 mb-3 text-2xl">
            {[1, 2, 3, 4, 5].map((s) => (
              <span
                key={s}
                className={s <= existing.rating ? "text-amber-400" : "text-white/20"}
              >
                ★
              </span>
            ))}
          </div>
          {existing.comment && (
            <p className="text-white/70 text-sm italic bg-black/30 rounded-xl px-4 py-2.5 mb-4 border border-white/5">
              "{existing.comment}"
            </p>
          )}
          <button
            onClick={() => {
              setRating(existing.rating);
              setComment(existing.comment || "");
              setIsEditing(true);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-4 py-1.5 rounded-lg border border-cyan-400/30 hover:border-cyan-400/60 transition-all cursor-pointer"
          >
            Edit Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 p-6 bg-[#0B0C10] border-t border-white/10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-4">
          <h3 className="text-white font-bold text-lg">How was your support experience?</h3>
          <p className="text-white/50 text-xs mt-1">Your rating helps us improve our service.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
          <div
            className="flex justify-center gap-2.5 cursor-pointer py-1"
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                className={`text-4xl transition-all transform hover:scale-110 ${
                  s <= (hoverRating || rating)
                    ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                    : "text-white/20 hover:text-amber-400/50"
                }`}
                onMouseEnter={() => setHoverRating(s)}
                onClick={() => setRating(s)}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what you liked or how we can improve (optional)..."
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-cyan-400/50 resize-none h-20 text-white placeholder-white/30"
          />

          <div className="flex gap-3 w-full">
            {existing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!rating || submitting}
              className="flex-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-6 py-3 text-sm font-bold text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
            >
              {submitting ? "Submitting..." : existing ? "Update Feedback" : "Submit Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SupportPortalPage() {
  const { companyCode } = useParams();
  const tokenKey = useMemo(
    () => `reslv_support_token_${companyCode}`,
    [companyCode],
  );

  // Auth States
  const [token, setToken] = useState(
    () => localStorage.getItem(tokenKey) || "",
  );
  const [companyInfo, setCompanyInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_ROOT}/public/support/${companyCode}/info`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setCompanyInfo(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [companyCode]);
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Portal States
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    subject: "",
    description: "",
  });
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  // UI States
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Keep the thread pinned to the latest message as new ones arrive.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTicket?.messages?.length, activeTicket?.thread?.length]);

  const updateTicketList = async (activeToken) => {
    try {
      const response = await fetch(
        `${API_ROOT}/public/support/${companyCode}/tickets`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`,
          },
        },
      );

      if (!response.ok) {
        // If token is invalid or expired, clear it
        localStorage.removeItem(tokenKey);
        setToken("");
        return;
      }

      const data = await response.json();
      const fetchedTickets = data.tickets || data || [];
      setTickets(fetchedTickets);

      // Keep active selection or select the most recent ticket
      if (fetchedTickets.length > 0) {
        setActiveTicket((prev) => {
          if (!prev) return fetchedTickets[0];
          const match = fetchedTickets.find(
            (t) =>
              (t._id || t.ticketNumber) === (prev._id || prev.ticketNumber),
          );
          return match || fetchedTickets[0];
        });
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
    }
  };

  // Trigger fetch whenever component mounts or token changes
  useEffect(() => {
    if (token) {
      updateTicketList(token);
    }
  }, [companyCode, token]);

  useEffect(() => {
    if (token) {
      updateTicketList(token);
    }
  }, [companyCode, token]);

  // Real-Time Socket Connection
  const activeMongoId = activeTicket?._id || activeTicket?.id;

  useEffect(() => {
    if (!token || !activeMongoId) return;

    const socket = io(WS_ROOT, { transports: ["websocket"] });

    // Join room using Mongo _id
    socket.emit("ticket:join", activeMongoId);

    const refreshActiveTicket = async () => {
      try {
        const response = await fetch(
          `${API_ROOT}/public/support/${companyCode}/tickets/${activeMongoId}`,
          {
            headers: authHeaders(token),
          },
        );
        if (response.ok) {
          const data = await response.json();
          const refreshed = data.ticket || data;
          setActiveTicket(refreshed);

          setTickets((prev) =>
            prev.map((item) =>
              getTicketId(item) === getTicketId(refreshed) ? refreshed : item,
            ),
          );
        }
      } catch (e) {
        console.error("Failed to refresh ticket:", e);
      }
    };

    // Whole-ticket-shape changes (status/severity) are low-frequency, so a
    // full refetch is simplest and cheap.
    socket.on("ticket:updated", refreshActiveTicket);

    // Chat messages are the hot path — append the pushed message directly
    // instead of refetching for instant delivery.
    socket.on("ticket:message", (message) => {
      setActiveTicket((prev) => {
        if (!prev) return prev;
        const messages = prev.messages || prev.thread || [];
        return {
          ...prev,
          messages: [...messages, message],
          lastMsg: message.text,
        };
      });
      setTickets((prev) =>
        prev.map((item) =>
          getTicketId(item) === activeMongoId
            ? { ...item, lastMsg: message.text }
            : item,
        ),
      );
    });

    // Reconciliation safety net: catch up on anything missed while disconnected.
    socket.on("connect", refreshActiveTicket);

    return () => socket.disconnect();
  }, [activeMongoId, token, companyCode]);

  // Auth Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = authMode === "login" ? "login" : "signup";

    try {
      const response = await fetch(
        `${API_ROOT}/public/support/${companyCode}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(authForm),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || `Failed to ${authMode}.`);

      localStorage.setItem(tokenKey, data.token);
      setToken(data.token);
      setAuthForm({ name: "", email: "", password: "" });
      setIsComposing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ticket Handlers
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_ROOT}/public/support/${companyCode}/tickets`,
        {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify(newTicketForm),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to create ticket.");

      const createdTicket = data.ticket || data;
      setTickets((prev) => [createdTicket, ...prev]);
      setActiveTicket(createdTicket);
      setIsComposing(false);
      setNewTicketForm({ subject: "", description: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const currentId = getTicketId(activeTicket);
    if (!currentId || !message.trim() || !token) return;

    setSending(true);
    try {
      const response = await fetch(
        `${API_ROOT}/public/support/${companyCode}/tickets/${currentId}/messages`,
        {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({ text: message.trim() }),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to send message.");

      const updatedTicket = data.ticket || data;
      setActiveTicket(updatedTicket);
      setTickets((prev) =>
        prev.map((item) =>
          getTicketId(item) === getTicketId(updatedTicket)
            ? updatedTicket
            : item,
        ),
      );
      setMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0D0F14] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-[#10131B] via-[#111827] to-[#0B1220] border border-white/10 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-400/70 mb-2">
              Support Portal
            </p>
            <div className="text-3xl font-bold text-cyan-300/80 mb-2 mt-4">
              {companyInfo?.name || companyCode?.toUpperCase()} Support
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <div className="flex bg-black/40 rounded-xl p-1 mb-6">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                authMode === "login"
                  ? "bg-white/10 text-white shadow"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                authMode === "signup"
                  ? "bg-white/10 text-white shadow"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === "signup" && (
              <div>
                <label className="block text-xs font-semibold uppercase text-white/55 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                  placeholder="Jane Doe"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase text-white/55 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-white/55 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : authMode === "login"
                  ? "Log In"
                  : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active message array resolution
  const threadMessages = activeTicket?.messages || activeTicket?.thread || [];

  const companyDisplayName =
    companyInfo?.name ||
    tickets[0]?.customerSnapshot?.company ||
    activeTicket?.customerSnapshot?.company ||
    (companyCode
      ? companyCode.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Support");

  return (
    <div className="h-screen overflow-hidden bg-[#07070A] text-white flex">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-white/10 bg-[#0B0C10] flex flex-col min-h-0">
        {/* Navbar / brand header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/10 flex-shrink-0 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {initialsOf(companyDisplayName)}
          </div>
          <div className="min-w-0">
            <span className="text-[15px] font-semibold text-white truncate block">
              {companyDisplayName}
            </span>
            {companyInfo?.supportHoursNote && (
              <span className="text-[11px] text-white/40 truncate block">
                {companyInfo.supportHoursNote}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-lg text-green-300">My Tickets</p>
            <button
              onClick={() => {
                localStorage.removeItem(tokenKey);
                setToken("");
              }}
              className="text-xs text-white"
            >
              Log out
            </button>
          </div>
          <button
            onClick={() => {
              setIsComposing(true);
              setActiveTicket(null);
            }}
            className="w-full rounded-lg bg-white/10 hover:bg-white/20 transition-colors py-2 text-sm font-medium flex items-center justify-center gap-2"
          >
            + New Support Ticket
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {tickets.length === 0 ? (
            <p className="text-center text-sm text-white/40 mt-10">
              No tickets found.
            </p>
          ) : (
            tickets.map((t) => {
              const currentId = getTicketId(t);
              const isActive = getTicketId(activeTicket) === currentId;
              return (
                <button
                  key={currentId}
                  onClick={() => {
                    setActiveTicket(t);
                    setIsComposing(false);
                  }}
                  className={`w-full text-left p-4 border-b border-l-2 border-white/5 transition-colors ${
                    isActive
                      ? "bg-white/10 border-l-cyan-400"
                      : "border-l-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium truncate pr-2">
                      {t.subject || t.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${statusStyle(t.status)}`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-white/50 truncate">
                      {t.ticketNumber || currentId}
                    </p>
                    {t.updatedAt && (
                      <p className="text-[10px] text-white/30 flex-shrink-0">
                        {new Date(t.updatedAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex-shrink-0 px-6 py-3 border-t border-white/10 text-center">
          <p className="text-[10px] text-white/25 tracking-wide">
            Powered by <span className="font-medium text-green-300">Reslv</span>
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col bg-[#0D0F14]">
        {isComposing ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-10 max-w-2xl mx-auto w-full">
            <h2 className="text-2xl font-semibold mb-6">Create a New Ticket</h2>
            {error && (
              <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-white/55 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={newTicketForm.subject}
                  onChange={(e) =>
                    setNewTicketForm({
                      ...newTicketForm,
                      subject: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                  placeholder="Brief summary of your issue"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-white/55 mb-2">
                  Description
                </label>
                <textarea
                  required
                  rows={6}
                  value={newTicketForm.description}
                  onChange={(e) =>
                    setNewTicketForm({
                      ...newTicketForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-cyan-400/50 resize-none"
                  placeholder="Provide details about what you need help with..."
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          </div>
        ) : activeTicket ? (
          <>
            <div className="flex-shrink-0 p-6 border-b border-white/10 bg-[#0B0C10] flex justify-between items-center">
              <div className="min-w-0">
                <p className="text-xl font-semibold truncate text-white/50">
                  {activeTicket.subject || activeTicket.title}
                </p>
                <p className="text-sm text-white/50 mt-1">
                  Ticket ID: {activeTicket.ticketNumber || activeTicket._id}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <span
                  className={`text-xs px-3 py-1 rounded-full capitalize ${statusStyle(activeTicket.status)}`}
                >
                  {activeTicket.status}
                </span>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
              {activeTicket.status === "resolved" && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm p-4 rounded-xl text-center">
                  This ticket has been marked as <strong>Resolved</strong>.
                </div>
              )}

              {threadMessages.length === 0 && (
                <p className="text-center text-sm text-white/30 mt-10">
                  No messages yet.
                </p>
              )}

              {threadMessages.map((msg, index) => {
                const isCustomer =
                  msg.from === "customer" || msg.senderRole === "customer";
                const senderName = isCustomer
                  ? "You"
                  : msg.agent || msg.senderName || "Support Agent";
                return (
                  <div
                    key={msg._id || msg.id || index}
                    className={`flex items-end gap-2 max-w-[80%] ${
                      isCustomer ? "ml-auto flex-row-reverse" : "mr-auto"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        isCustomer
                          ? "bg-cyan-500/25 text-cyan-200"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {initialsOf(senderName)}
                    </div>
                    <div
                      className={`flex flex-col min-w-0 ${isCustomer ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[11px] text-white/40 mb-1 px-1">
                        {senderName}{" "}
                        {msg.time
                          ? `• ${new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : ""}
                      </span>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isCustomer
                            ? "bg-cyan-600 text-white rounded-br-sm"
                            : "bg-white/10 text-white/90 rounded-bl-sm"
                        }`}
                      >
                        {msg.text || msg.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input or Feedback */}
            {activeTicket.status !== "resolved" ? (
              <div className="flex-shrink-0 p-4 bg-[#0B0C10] border-t border-white/10">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={sending}
                    placeholder="Reply to this ticket..."
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-cyan-400/50 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || sending}
                    className="rounded-xl bg-white text-black px-6 py-3 text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </form>
              </div>
            ) : (
              <TicketFeedback
                ticketId={activeTicket.ticketNumber || activeTicket._id}
                companyCode={companyCode}
                token={token}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-white/40 px-6">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-2xl">
              💬
            </div>
            <p className="text-white/60 font-medium">
              {tickets.length === 0
                ? "No tickets yet"
                : "Select a ticket from the sidebar"}
            </p>
            <p className="text-sm text-white/30 mt-1 max-w-[240px]">
              {tickets.length === 0
                ? "Start a new support ticket to get help from our team."
                : "Choose a conversation to view its messages."}
            </p>
          </div>
        )}
      </div>
      <ChatWidget
        apiRoot={API_ROOT}
        wsRoot={WS_ROOT}
        companyCode={companyCode}
        token={token}
        onHandoff={() => updateTicketList(token)}
      />
    </div>
  );
}
