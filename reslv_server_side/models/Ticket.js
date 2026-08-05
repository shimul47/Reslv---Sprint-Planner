import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    from: {
      type: String,
      enum: ["customer", "agent", "internal"],
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
    escalationStep: {
      type: Number,
      default: 0,
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

const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);

export default Ticket;
