import mongoose from "mongoose";

const chatbotMessageSchema = new mongoose.Schema(
  {
    from: { type: String, enum: ["customer", "bot"], required: true },
    text: { type: String, required: true },
    time: { type: Date, default: Date.now },
  },
  { _id: false },
);

// Kept separate from Ticket while a conversation is bot-only — most
// chatbot sessions never need to become a ticket at all (e.g. "how do I
// reset my password"). A Ticket is only created at the moment of handoff.
const chatbotSessionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    // Null for an anonymous pre-login visitor using a public marketing-site
    // widget — the portal-embedded widget always sets this.
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["bot", "handed_off", "closed"],
      default: "bot",
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
    messages: {
      type: [chatbotMessageSchema],
      default: [],
    },
  },
  { timestamps: true },
);

const ChatbotSession =
  mongoose.models.ChatbotSession || mongoose.model("ChatbotSession", chatbotSessionSchema);

export default ChatbotSession;