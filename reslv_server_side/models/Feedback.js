import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    // The ticket or task this feedback is for
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    // The customer who left the review
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The agent/team-member who resolved the ticket/task
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    // Distinguishes ticket reviews from task reviews
    type: {
      type: String,
      enum: ["ticket", "task"],
      default: "ticket",
    },
  },
  { timestamps: true },
);

// One review per customer per ticket (or task)
feedbackSchema.index({ ticketId: 1, customerId: 1 }, { unique: true, sparse: true });
feedbackSchema.index({ taskId: 1, customerId: 1 }, { unique: true, sparse: true });
// Dashboard queries: all feedback for a company, ordered by recency
feedbackSchema.index({ companyId: 1, createdAt: -1 });
// Per-agent satisfaction lookups
feedbackSchema.index({ agentId: 1, createdAt: -1 });

const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);

export default Feedback;
