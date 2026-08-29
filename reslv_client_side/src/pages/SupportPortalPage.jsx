import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { Users } from "lucide-react";
import ChatWidget from "../components/chatbot/ChatWidget.jsx";
import { renderMessageText } from "../utils/chatFormatting.jsx";

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

// Same pastel-chip status language used elsewhere in the app (Sprint
// Planner's Free/Busy/Off-duty pills, task-request badges) — green for
// resolved, amber for needs-attention, blue/indigo for in-flight.
const STATUS_STYLES = {
  open: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "in-progress": "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  escalated: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  resolved: "bg-green-500/10 text-green-600 border-green-500/20",
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
      <div className="flex-shrink-0 p-6 bg-[var(--color-card)] border-t border-[var(--color-border)] text-center">
        <div className="max-w-md mx-auto bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow)]">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-semibold uppercase tracking-wider mb-3">
            ✓ Feedback Submitted
          </div>
          <h4 className="text-[var(--text-h)] font-semibold text-base mb-2">Thank you for your review!</h4>
          <div className="flex justify-center gap-1.5 mb-3 text-2xl">
            {[1, 2, 3, 4, 5].map((s) => (
              <span
                key={s}
                className={s <= existing.rating ? "text-amber-400" : "text-[var(--color-border)]"}
              >
                ★
              </span>
            ))}
          </div>
          {existing.comment && (
            <p className="text-[var(--text)] opacity-80 text-sm italic bg-[var(--color-muted)] rounded-[var(--radius-md)] px-4 py-2.5 mb-4 border border-[var(--color-border)]">
              "{existing.comment}"
            </p>
          )}
          <button
            onClick={() => {
              setRating(existing.rating);
              setComment(existing.comment || "");
              setIsEditing(true);
            }}
            className="text-xs text-[var(--color-accent)] hover:opacity-80 font-medium px-4 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-accent)]/30 hover:border-[var(--color-accent)]/60 transition-all cursor-pointer"
          >
            Edit Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 p-6 bg-[var(--color-card)] border-t border-[var(--color-border)]">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-4">
          <h3 className="text-[var(--text-h)] font-bold text-lg">How was your support experience?</h3>
          <p className="text-[var(--text)] opacity-60 text-xs mt-1">Your rating helps us improve our service.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-xs rounded-[var(--radius-md)] text-center">
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
                    ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                    : "text-[var(--color-border)] hover:text-amber-400/50"
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
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)] resize-none h-20 text-[var(--color-foreground)] placeholder:text-[var(--text)] placeholder:opacity-50"
          />

          <div className="flex gap-3 w-full">
            {existing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--text)] hover:text-[var(--text-h)] hover:bg-[var(--color-muted)] text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!rating || submitting}
              className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] hover:opacity-90 px-6 py-3 text-sm font-bold text-[var(--accent-foreground)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--shadow)] cursor-pointer"
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
      <div className="min-h-screen bg-[var(--background)] text-[var(--color-foreground)] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[var(--radius-xl)] bg-[var(--color-card)] border border-[var(--color-border)] p-8 shadow-[var(--shadow)]">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-accent)] text-[var(--accent-foreground)] flex items-center justify-center text-lg font-bold mx-auto mb-4">
              {initialsOf(companyInfo?.name || companyCode)}
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)] mb-2">
              Support Portal
            </p>
            <div className="text-2xl font-bold text-[var(--text-h)]">
              {companyInfo?.name || companyCode?.toUpperCase()} Support
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-[var(--radius-md)] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex bg-[var(--color-muted)] rounded-[var(--radius-md)] p-1 mb-6">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                authMode === "login"
                  ? "bg-[var(--color-card)] text-[var(--text-h)] shadow-[var(--shadow)]"
                  : "text-[var(--text)] opacity-60 hover:opacity-100"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                authMode === "signup"
                  ? "bg-[var(--color-card)] text-[var(--text-h)] shadow-[var(--shadow)]"
                  : "text-[var(--text)] opacity-60 hover:opacity-100"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === "signup" && (
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--text)] opacity-60 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, name: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)] text-[var(--color-foreground)]"
                  placeholder="Jane Doe"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--text)] opacity-60 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)] text-[var(--color-foreground)]"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--text)] opacity-60 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)] text-[var(--color-foreground)]"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer shadow-[var(--shadow)]"
            >
              {loading
                ? "Please wait..."
                : authMode === "login"
                  ? "Log In"
                  : "Create Account"}
            </button>
          </form>
        </div>
        <ChatWidget
          apiRoot={API_ROOT}
          wsRoot={WS_ROOT}
          companyCode={companyCode}
          token=""
        />
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
    <div className="h-screen overflow-hidden bg-[var(--background)] text-[var(--color-foreground)] flex">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-card)] flex flex-col min-h-0">
        {/* Navbar / brand header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--color-border)] flex-shrink-0 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--accent-foreground)] flex items-center justify-center text-sm font-bold flex-shrink-0">
            {initialsOf(companyDisplayName)}
          </div>
          <div className="min-w-0">
            <span className="text-[15px] font-semibold text-[var(--text-h)] truncate block">
              {companyDisplayName}
            </span>
            {companyInfo?.supportHoursNote && (
              <span className="text-[11px] text-[var(--text)] opacity-50 truncate block">
                {companyInfo.supportHoursNote}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 border-b border-[var(--color-border)] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-lg text-[var(--text-h)]">My Tickets</p>
            <button
              onClick={() => {
                localStorage.removeItem(tokenKey);
                setToken("");
              }}
              className="text-xs text-[var(--text)] opacity-70 hover:opacity-100 cursor-pointer"
            >
              Log out
            </button>
          </div>
          <button
            onClick={() => {
              setIsComposing(true);
              setActiveTicket(null);
            }}
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--accent-foreground)] hover:opacity-90 transition-colors py-2 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer shadow-[var(--shadow)]"
          >
            + New Support Ticket
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {tickets.length === 0 ? (
            <p className="text-center text-sm text-[var(--text)] opacity-50 mt-10">
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
                  className={`w-full text-left p-4 border-b border-l-2 border-[var(--color-border)] transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[var(--color-muted)] border-l-[var(--color-accent)]"
                      : "border-l-transparent hover:bg-[var(--color-muted)]/60"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-[var(--text-h)] truncate pr-2">
                      {t.subject || t.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 border ${statusStyle(t.status)}`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-[var(--text)] opacity-60 truncate">
                      {t.ticketNumber || currentId}
                    </p>
                    {t.updatedAt && (
                      <p className="text-[10px] text-[var(--text)] opacity-40 flex-shrink-0">
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

        <div className="flex-shrink-0 px-6 py-3 border-t border-[var(--color-border)] text-center">
          <p className="text-[10px] text-[var(--text)] opacity-40 tracking-wide">
            Powered by <span className="font-medium text-[var(--color-accent)]">Reslv</span>
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col bg-[var(--background)]">
        {isComposing ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-10 max-w-2xl mx-auto w-full">
            <h2 className="text-2xl font-semibold mb-6 text-[var(--text-h)]">Create a New Ticket</h2>
            {error && (
              <div className="mb-4 rounded-[var(--radius-md)] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--text)] opacity-60 mb-2">
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
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)] text-[var(--color-foreground)]"
                  placeholder="Brief summary of your issue"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--text)] opacity-60 mb-2">
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
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)] resize-none text-[var(--color-foreground)]"
                  placeholder="Provide details about what you need help with..."
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer shadow-[var(--shadow)]"
              >
                {loading ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          </div>
        ) : activeTicket ? (
          <>
            <div className="flex-shrink-0 p-6 border-b border-[var(--color-border)] bg-[var(--color-card)] flex justify-between items-center">
              <div className="min-w-0">
                <p className="text-xl font-semibold truncate text-[var(--text-h)]">
                  {activeTicket.subject || activeTicket.title}
                </p>
                <p className="text-sm text-[var(--text)] opacity-60 mt-1">
                  Ticket ID: {activeTicket.ticketNumber || activeTicket._id}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <span
                  className={`text-xs px-3 py-1 rounded-full capitalize border ${statusStyle(activeTicket.status)}`}
                >
                  {activeTicket.status}
                </span>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
              {activeTicket.status === "resolved" && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-700 text-sm p-4 rounded-[var(--radius-md)] text-center">
                  This ticket has been marked as <strong>Resolved</strong>.
                </div>
              )}

              {threadMessages.length === 0 && (
                <p className="text-center text-sm text-[var(--text)] opacity-40 mt-10">
                  No messages yet.
                </p>
              )}

              {threadMessages.map((msg, index) => {
                // A system status line (e.g. a chatbot handoff) is a banner
                // announcing an event, not a message from either party — it
                // renders centered, never as a left/right chat bubble.
                if (msg.from === "system") {
                  return (
                    <div key={msg._id || msg.id || index} className="flex justify-center">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text)] opacity-70 bg-[var(--color-muted)] border border-[var(--color-border)] rounded-full px-3.5 py-1.5">
                        <Users size={11} /> {msg.text}
                      </span>
                    </div>
                  );
                }

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
                          ? "bg-[var(--color-accent)] text-[var(--accent-foreground)]"
                          : "bg-[var(--color-muted)] text-[var(--text)]"
                      }`}
                    >
                      {initialsOf(senderName)}
                    </div>
                    <div
                      className={`flex flex-col min-w-0 ${isCustomer ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[11px] text-[var(--text)] opacity-50 mb-1 px-1">
                        {senderName}{" "}
                        {msg.time
                          ? `• ${new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : ""}
                      </span>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isCustomer
                            ? "bg-[var(--color-accent)] text-[var(--accent-foreground)] rounded-br-sm"
                            : "bg-[var(--color-muted)] text-[var(--text-h)] rounded-bl-sm"
                        }`}
                      >
                        {renderMessageText(msg.text || msg.message)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input or Feedback */}
            {activeTicket.status !== "resolved" ? (
              <div className="flex-shrink-0 p-4 bg-[var(--color-card)] border-t border-[var(--color-border)]">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={sending}
                    placeholder="Reply to this ticket..."
                    className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input-background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)] disabled:opacity-50 text-[var(--color-foreground)]"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || sending}
                    className="rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--accent-foreground)] px-6 py-3 text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer shadow-[var(--shadow)]"
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
          <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--text)] opacity-60 px-6">
            <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--color-muted)] flex items-center justify-center mb-4 text-2xl">
              💬
            </div>
            <p className="text-[var(--text-h)] opacity-80 font-medium">
              {tickets.length === 0
                ? "No tickets yet"
                : "Select a ticket from the sidebar"}
            </p>
            <p className="text-sm text-[var(--text)] opacity-50 mt-1 max-w-[240px]">
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
