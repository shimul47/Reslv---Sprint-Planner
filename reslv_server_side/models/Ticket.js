import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    from: {
      type: String,
      // "internal" = private staff note, hidden from the customer. "system"
      // = a visible automated status line (e.g. a chatbot handoff) shown to
      // everyone in the main thread — different audience, different meaning.
      enum: ["customer", "agent", "internal", "system"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    agent: {
      type: String,
      default: "",
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    time: {
      type: Date,
      default: Date.now,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const customerSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    company: { type: String, default: "" },
    plan: { type: String, default: "Starter" },
    arr: { type: String, default: "$0/yr" },
    churn: { type: String, default: "low" },
    totalTickets: { type: Number, default: 0 },
    openTickets: { type: Number, default: 0 },
    since: { type: String, default: "" },
    initials: { type: String, default: "U" },
    hue: { type: Number, default: 252 },
  },
  { _id: false },
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "escalated", "resolved"],
      default: "open",
      index: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    channel: {
      type: String,
      enum: ["email", "chat", "phone", "web"],
      default: "web",
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignee: {
      type: String,
      default: "Unassigned",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    lastMsg: {
      type: String,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    // Populated when an agent escalates an assigned ticket to admin: an
    // AI-drafted summary of the issue + suggested team, and later (once the
    // linked sprint task is done) an AI-drafted summary of the work done.
    escalation: {
      summary: { type: String, default: "" },
      suggestedSegmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Segment",
        default: null,
      },
      suggestedTeamName: { type: String, default: "" },
      generatedAt: { type: Date, default: null },
      completionSummary: { type: String, default: "" },
      completionGeneratedAt: { type: Date, default: null },
      _id: false,
    },
    // Set once an admin turns this escalated ticket into a sprint task —
    // absence/presence plus the linked Task's status is how the admin
    // escalation inbox derives "awaiting review" vs "with employee" vs
    // "ready to resolve", instead of adding new ticket status values.
    linkedTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },
    slaMins: {
      type: Number,
      default: 120,
    },
    slaTotal: {
      type: Number,
      default: 240,
    },
    customerSnapshot: {
      type: customerSnapshotSchema,
      default: () => ({}),
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Compound indexes to speed up dashboard list fetching
ticketSchema.index({ companyId: 1, createdAt: -1 });
ticketSchema.index({ companyId: 1, createdBy: 1 });
ticketSchema.index({ companyId: 1, assignedTo: 1, status: 1 });

const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);

export default Ticket;
