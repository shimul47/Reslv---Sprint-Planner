import ChatbotSession from "../models/ChatbotSession.js";
import Company from "../models/Company.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { gemini, GEMINI_MODEL } from "../config/gemini.js";
import { buildSystemPrompt } from "../services/chatbotPromptService.js";
import { isDisallowedMessage, moderationReply } from "../services/chatModerationService.js";
import { recomputeTicketImpact } from "../utils/businessImpact.js";

// A signed-out visitor can try the bot without an account, but only for a
// handful of messages — past this, they're asked to sign in rather than
// getting cut off with no explanation.
const ANONYMOUS_MESSAGE_LIMIT = 5;

// A fixed sentinel the model is instructed to emit (see
// services/chatbotPromptService.js) when a question needs a human — kept
// deterministic rather than asking the model to call a tool, since no
// RAG/tool-use was scoped for this bot.
const HANDOFF_SENTINEL = "[[HANDOFF]]";

function initialsFromName(name) {
  return (
    (name || "U")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

function hueFromEmail(email) {
  let hash = 0;
  for (const char of email || "") hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return 180 + (hash % 140);
}

// POST /api/chatbot/sessions — customer auth is optional (see
// optionalCustomerAuth), supporting both the portal-embedded widget (signed
// in) and an anonymous pre-login marketing-site widget.
export const createSession = async (req, res) => {
  try {
    let companyId = req.user?.companyId || null;
    if (!companyId && req.body.companyCode) {
      const company = await Company.findOne({ companyCode: req.body.companyCode }).select("_id").lean();
      companyId = company?._id || null;
    }
    if (!companyId) {
      return res.status(400).json({ message: "companyCode is required." });
    }

    const session = await ChatbotSession.create({
      companyId,
      customerId: req.user?._id || null,
    });

    res.status(201).json({ session });
  } catch (error) {
    console.error("Create chatbot session error:", error);
    res.status(500).json({ message: "Failed to start chat session." });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: "Message text is required." });
    }

    const session = await ChatbotSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: "Chat session not found." });
    }
    if (session.status !== "bot") {
      return res.status(409).json({ message: "This conversation has already been handed off." });
    }

    if (!session.customerId) {
      const customerMessageCount = session.messages.filter((m) => m.from === "customer").length;
      if (customerMessageCount >= ANONYMOUS_MESSAGE_LIMIT) {
        return res.status(403).json({
          message: "You've reached the guest chat limit — sign in to keep the conversation going.",
          limitReached: true,
        });
      }
    }

    session.messages.push({ from: "customer", text: text.trim() });

    // Clearly abusive/disallowed messages get a fixed passive reply and
    // never reach Gemini or the [[HANDOFF]] path — no API spend, and no
    // ticket gets created just because someone swore at the bot.
    if (isDisallowedMessage(text)) {
      const replyText = moderationReply();
      session.messages.push({ from: "bot", text: replyText });
      await session.save();

      const io = req.app.get("io");
      if (io) {
        io.to(`chatbot:${session._id}`).emit("chatbot:message", {
          from: "bot",
          text: replyText,
          time: new Date(),
        });
      }

      return res.json({ reply: replyText, handoffSuggested: false, session });
    }

    const systemPrompt = await buildSystemPrompt(session.companyId, session.customerId);
    const contents = session.messages.map((m) => ({
      role: m.from === "customer" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    let replyText;
    try {
      const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: { systemInstruction: systemPrompt },
      });
      replyText = response.text?.trim() || `Sorry, I couldn't come up with an answer just now. ${HANDOFF_SENTINEL}`;
    } catch (error) {
      console.error("Gemini generateContent error:", error);
      replyText = `I'm having trouble answering right now. ${HANDOFF_SENTINEL}`;
    }

    const handoffSuggested = replyText.includes(HANDOFF_SENTINEL);
    const displayText = replyText.replace(HANDOFF_SENTINEL, "").trim();

    session.messages.push({ from: "bot", text: displayText });
    await session.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`chatbot:${session._id}`).emit("chatbot:message", {
        from: "bot",
        text: displayText,
        time: new Date(),
      });
    }

    res.json({ reply: displayText, handoffSuggested, session });
  } catch (error) {
    console.error("Chatbot send message error:", error);
    res.status(500).json({ message: "Failed to send message." });
  }
};

// POST /api/chatbot/sessions/:id/handoff — triggered either by the
// [[HANDOFF]] sentinel or an explicit "talk to a human" click. Creates a
// real Ticket via the same shape createTicket uses, copies the bot
// conversation into it so the agent has full context, and emits the
// existing ticket:created event — the agent inbox needs zero changes to
// pick it up.
export const handoff = async (req, res) => {
  try {
    const session = await ChatbotSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: "Chat session not found." });
    }
    if (session.status === "handed_off") {
      return res.json({ ticketId: session.ticketId, session });
    }
    if (!session.customerId) {
      return res.status(400).json({ message: "Sign in to connect with a live agent." });
    }

    const [customer, company] = await Promise.all([
      User.findById(session.customerId).select("name email").lean(),
      Company.findById(session.companyId).select("name").lean(),
    ]);
    const displayName = customer?.name || "Customer";
    const displayEmail = customer?.email || "";

    const openingMessage = session.messages.find((m) => m.from === "customer")?.text || "Chat handoff";
    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;

    const ticket = new Ticket({
      ticketNumber,
      title: openingMessage.slice(0, 120),
      subject: openingMessage.slice(0, 120),
      description: openingMessage,
      status: "open",
      severity: "medium",
      channel: "chat",
      companyId: session.companyId,
      createdBy: session.customerId,
      lastMsg: session.messages[session.messages.length - 1]?.text || openingMessage,
      customerSnapshot: {
        name: displayName,
        email: displayEmail,
        company: company?.name || "",
        initials: initialsFromName(displayName),
        hue: hueFromEmail(displayEmail),
      },
      messages: session.messages.map((m) => ({
        from: m.from === "customer" ? "customer" : "agent",
        text: m.text,
        agent: m.from === "bot" ? "Reslv Chatbot" : displayName,
        authorId: m.from === "customer" ? session.customerId : null,
        time: m.time,
        read: false,
      })),
    });

    // A visible status line marking the handoff itself — rendered as a
    // centered banner (not a chat bubble) in both the customer portal and
    // the agent inbox, so the transition from bot to human reads as a clear
    // event rather than blending into the message list.
    ticket.messages.push({
      from: "system",
      text: "Connecting you to a live agent",
    });

    await recomputeTicketImpact(ticket);
    await ticket.save();

    session.status = "handed_off";
    session.ticketId = ticket._id;
    await session.save();

    const io = req.app.get("io");
    if (io) {
      // The agent inbox's ticket:created listener just triggers a refetch
      // regardless of payload shape, so the raw doc is fine here.
      io.to(`company:${session.companyId}`).emit("ticket:created", ticket);
    }

    res.json({ ticketId: ticket._id, ticketNumber: ticket.ticketNumber, session });
  } catch (error) {
    console.error("Chatbot handoff error:", error);
    res.status(500).json({ message: "Failed to hand off to a live agent." });
  }
};
