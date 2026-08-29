import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { MessageCircle, X, Send, UserRound } from "lucide-react";

// Self-contained floating chat widget for the customer support portal.
// Deliberately uses plain fetch + its own socket connection (like
// SupportPortalPage itself) rather than the shared `api` axios instance,
// since that instance is wired to the staff/agent JWT in localStorage, not
// this portal's per-company customer token.
const LIST_MARKER = /^\s*(?:[-*]|\d+\.)\s+/;

// Splits a line on **bold** markers into plain strings and <strong> nodes —
// the model replies in light markdown, but the bubble isn't a full markdown
// renderer, so only the bit customers actually notice (bold) is handled.
function renderBoldSegments(line, keyPrefix) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

// Gemini replies come back as loose markdown (paragraphs, "- " lists, blank
// lines between them) which a plain {text} render collapses into one run-on
// line — this turns it back into paragraphs/lists so it reads the way it
// was written.
function renderMessageText(text) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return null;

  return blocks.map((block, bi) => {
    const lines = block.split("\n").filter((l) => l.trim());
    if (lines.every((l) => LIST_MARKER.test(l))) {
      return (
        <ul key={bi} className="list-disc list-inside space-y-1">
          {lines.map((line, li) => (
            <li key={li}>{renderBoldSegments(line.replace(LIST_MARKER, ""), `${bi}-${li}`)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={bi}>
        {lines.map((line, li) => (
          <span key={li}>
            {renderBoldSegments(line, `${bi}-${li}`)}
            {li < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

export default function ChatWidget({ apiRoot, wsRoot, companyCode, token, onHandoff }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [handoffState, setHandoffState] = useState("none"); // none | connecting | done
  const [error, setError] = useState("");
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
          text: "Hi! I'm the Reslv assistant. Ask me about your tickets, how support works, or how to use Reslv — and I'll connect you with a live agent if you need one.",
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
      if (!res.ok) throw new Error(data.message || "Failed to send message.");

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
      <button
        onClick={openWidget}
        aria-label="Open chat assistant"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black shadow-xl flex items-center justify-center transition-colors z-50 cursor-pointer"
      >
        <MessageCircle size={22} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[340px] h-[460px] bg-[#0B0C10] border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
        <div className="flex items-center gap-2 text-white/80 text-sm font-semibold">
          <UserRound size={15} className="text-cyan-400" />
          Reslv Assistant
        </div>
        <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/80 cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed space-y-2 ${
              m.from === "customer"
                ? "ml-auto bg-cyan-600 text-white rounded-br-sm"
                : "mr-auto bg-white/10 text-white/90 rounded-bl-sm"
            }`}
          >
            {m.from === "bot" ? renderMessageText(m.text) : m.text}
          </div>
        ))}
        {sending && handoffState === "none" && (
          <div className="mr-auto max-w-[85%] px-3 py-2.5 rounded-2xl rounded-bl-sm bg-white/10 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" />
          </div>
        )}
        {handoffState === "connecting" && (
          <p className="text-center text-[11px] text-white/40">Connecting you to a live agent…</p>
        )}
        {error && <p className="text-center text-[11px] text-red-400">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex-shrink-0 p-2.5 border-t border-white/10 bg-black/20 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending || handoffState !== "none"}
          placeholder="Ask a question…"
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-400/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending || handoffState !== "none"}
          className="w-9 h-9 flex-shrink-0 rounded-xl bg-white text-black flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
