import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

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

  // UI States
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    socket.on("ticket:updated", refreshActiveTicket);
    socket.on("ticket:message", refreshActiveTicket);

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
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0D0F14] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-[#10131B] via-[#111827] to-[#0B1220] border border-white/10 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/70 mb-2">
              Support Portal
            </p>
            <h1 className="text-2xl font-semibold">
              {companyCode?.toUpperCase()} Support
            </h1>
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

  return (
    <div className="min-h-screen bg-[#07070A] text-white flex">
      {/* Sidebar */}
      <div className="w-80 border-r border-white/10 bg-[#0B0C10] flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">My Tickets</h2>
            <button
              onClick={() => {
                localStorage.removeItem(tokenKey);
                setToken("");
              }}
              className="text-xs text-white/40 hover:text-white"
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

        <div className="flex-1 overflow-y-auto">
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
                  className={`w-full text-left p-4 border-b border-white/5 transition-colors ${
                    isActive ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium truncate pr-2">
                      {t.subject || t.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        t.status === "resolved"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-cyan-500/20 text-cyan-300"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 truncate">
                    {t.ticketNumber || currentId}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0D0F14]">
        {isComposing ? (
          <div className="p-10 max-w-2xl mx-auto w-full">
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
            <div className="p-6 border-b border-white/10 bg-[#0B0C10] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">
                  {activeTicket.subject || activeTicket.title}
                </h2>
                <p className="text-sm text-white/50 mt-1">
                  Ticket ID: {activeTicket.ticketNumber || activeTicket._id}
                </p>
              </div>
              <div className="flex gap-2">
                {activeTicket.severity && (
                  <span className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 capitalize">
                    {activeTicket.severity} Priority
                  </span>
                )}
                <span
                  className={`text-xs px-3 py-1 rounded-full border ${
                    activeTicket.status === "resolved"
                      ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                      : "border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
                  } capitalize`}
                >
                  {activeTicket.status}
                </span>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTicket.status === "resolved" && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm p-4 rounded-xl text-center">
                  This ticket has been marked as <strong>Resolved</strong>.
                </div>
              )}

              {threadMessages.map((msg, index) => {
                const isCustomer =
                  msg.from === "customer" || msg.senderRole === "customer";
                return (
                  <div
                    key={msg._id || msg.id || index}
                    className={`flex flex-col max-w-[80%] ${
                      isCustomer ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <span className="text-[11px] text-white/40 mb-1 px-1">
                      {isCustomer
                        ? "You"
                        : msg.agent || msg.senderName || "Support Agent"}{" "}
                      {msg.time
                        ? `• ${new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : ""}
                    </span>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isCustomer
                          ? "bg-cyan-600 text-white rounded-br-none"
                          : "bg-white/10 text-white/90 rounded-bl-none"
                      }`}
                    >
                      {msg.text || msg.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            {activeTicket.status !== "resolved" && (
              <div className="p-4 bg-[#0B0C10] border-t border-white/10">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Reply to this ticket..."
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="rounded-xl bg-white text-black px-6 py-3 text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/40">
            Select a ticket from the sidebar to view details.
          </div>
        )}
      </div>
    </div>
  );
}
