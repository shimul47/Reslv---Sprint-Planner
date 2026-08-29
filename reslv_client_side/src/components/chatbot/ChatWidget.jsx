import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { X, Send } from "lucide-react";
import chatbotMascot from "./chatbot.png";
import { renderMessageText } from "../../utils/chatFormatting.jsx";

// Self-contained floating chat widget for the customer support portal.
// Deliberately uses plain fetch + its own socket connection (like
// SupportPortalPage itself) rather than the shared `api` axios instance,
// since that instance is wired to the staff/agent JWT in localStorage, not
// this portal's per-company customer token.

export default function ChatWidget({ apiRoot, wsRoot, companyCode, token, onHandoff }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [handoffState, setHandoffState] = useState("none"); // none | connecting | done
  const [error, setError] = useState("");
  const [guestLimitReached, setGuestLimitReached] = useState(false);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  function authHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  const ensureSession = async () => {
    if (session) return session;
    const res = await fetch(`${apiRoot}/chatbot/sessions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ companyCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Couldn't start the chat.");
    setSession(data.session);

    const socket = io(wsRoot, { transports: ["websocket"] });
    socket.emit("chatbot:join", data.session._id);
    socket.on("chatbot:message", (msg) => {
      setMessages((prev) => [...prev, { from: msg.from, text: msg.text }]);
    });
    socketRef.current = socket;

    return data.session;
  };

  const openWidget = async () => {
    setOpen(true);
    if (session) return;
    try {
      await ensureSession();
      setMessages([
        {
          from: "bot",
          text: "Hi! I'm the Reslv Chatbot. Ask me about your tickets, how support works, or how to use Reslv — and I'll connect you with a live agent if you need one.",
        },
      ]);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    return () => socketRef.current?.disconnect();
  }, []);

  const triggerHandoff = async (activeSession) => {
    setHandoffState("connecting");
    try {
      const res = await fetch(`${apiRoot}/chatbot/sessions/${activeSession._id}/handoff`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Couldn't connect you to a live agent.");

      setMessages((prev) => [
        ...prev,
        { from: "bot", text: `Connecting you with a live agent — ticket ${data.ticketNumber} is ready.` },
      ]);
      setHandoffState("done");
      onHandoff?.(data.ticketNumber);
      setTimeout(() => setOpen(false), 1200);
    } catch (err) {
      setError(err.message);
      setHandoffState("none");
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || handoffState !== "none") return;

    setError("");
    setInput("");
    setMessages((prev) => [...prev, { from: "customer", text }]);
    setSending(true);

    try {
      const activeSession = await ensureSession();
      const res = await fetch(`${apiRoot}/chatbot/sessions/${activeSession._id}/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.limitReached) setGuestLimitReached(true);
        throw new Error(data.message || "Failed to send message.");
      }

      setMessages((prev) => [...prev, { from: "bot", text: data.reply }]);
      if (data.handoffSuggested) {
        await triggerHandoff(activeSession);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <div className="fixed bottom-28 right-6 z-50 flex flex-col items-end gap-1.5">
        <div className="relative bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--text-h)] text-xs font-medium px-3 py-1.5 rounded-[var(--radius-md)] shadow-[var(--shadow)] whitespace-nowrap mr-2">
          Need help? Just ask me anything 💬
          <span className="absolute -bottom-[5px] right-7 w-2.5 h-2.5 bg-[var(--accent-bg)] border-b border-r border-[var(--accent-border)] rotate-45" />
        </div>
        <button
          onClick={openWidget}
          aria-label="Open chat assistant"
          className="group relative w-20 h-24 flex flex-col items-center justify-start cursor-pointer"
        >
          <img
            src={chatbotMascot}
            alt="Reslv Chatbot mascot"
            className="w-20 h-20 object-contain drop-shadow-xl transition-transform duration-300 animate-[chat-float_3s_ease-in-out_infinite] group-hover:[animation-play-state:paused] group-hover:scale-110"
          />
          <span className="w-9 h-2.5 rounded-[50%] bg-black blur-[3px] animate-[chat-float-shadow_3s_ease-in-out_infinite] group-hover:[animation-play-state:paused]" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-28 right-6 w-[340px] h-[460px] bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow)] flex flex-col z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="flex items-center gap-2 text-[var(--text-h)] text-sm font-semibold">
          <img src={chatbotMascot} alt="" className="w-7 h-7 object-contain" />
          Reslv Chatbot
        </div>
        <button onClick={() => setOpen(false)} className="text-[var(--text)] opacity-50 hover:opacity-90 cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-end gap-1.5 max-w-[85%] ${
              m.from === "customer" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            {m.from === "bot" && (
              <img src={chatbotMascot} alt="" className="w-6 h-6 object-contain flex-shrink-0 mb-1" />
            )}
            <div
              className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed space-y-2 min-w-0 ${
                m.from === "customer"
                  ? "bg-[var(--color-accent)] text-[var(--accent-foreground)] rounded-br-sm"
                  : "bg-[var(--color-muted)] text-[var(--text-h)] rounded-bl-sm"
              }`}
            >
              {m.from === "bot" ? renderMessageText(m.text) : m.text}
            </div>
          </div>
        ))}
        {sending && handoffState === "none" && (
          <div className="mr-auto max-w-[85%] flex items-end gap-1.5">
            <img src={chatbotMascot} alt="" className="w-6 h-6 object-contain flex-shrink-0 mb-1" />
            <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm bg-[var(--color-muted)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text)] opacity-40 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text)] opacity-40 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text)] opacity-40 animate-bounce" />
            </div>
          </div>
        )}
        {handoffState === "connecting" && (
          <p className="text-center text-[11px] text-[var(--text)] opacity-50">Connecting you to a live agent…</p>
        )}
        {error && !guestLimitReached && <p className="text-center text-[11px] text-red-500">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {guestLimitReached ? (
        <div className="flex-shrink-0 p-3 border-t border-[var(--color-border)] bg-[var(--color-muted)] text-center">
          <p className="text-[11px] text-[var(--text)] opacity-80">
            You've reached the guest chat limit — sign in from the portal to keep chatting.
          </p>
        </div>
      ) : (
        <form onSubmit={sendMessage} className="flex-shrink-0 p-2.5 border-t border-[var(--color-border)] bg-[var(--color-card)] flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending || handoffState !== "none"}
            placeholder="Ask a question…"
            className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-input-background)] px-3 py-2 text-[13px] text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || handoffState !== "none"}
            className="w-9 h-9 flex-shrink-0 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--accent-foreground)] flex items-center justify-center hover:opacity-90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send size={14} />
          </button>
        </form>
      )}
    </div>
  );
}
