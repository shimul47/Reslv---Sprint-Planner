import Feedback from "../models/Feedback.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";

// Roles that have access to feedback analytics / dashboard
const ADMIN_ROLES = ["superadmin", "admin"];

// ─── Submit Feedback ─────────────────────────────────────────
// POST /api/feedback
// Body: { ticketNumber, rating, comment? }
export const submitFeedback = async (req, res) => {
  try {
    const { ticketNumber, rating, comment } = req.body;

    if (!ticketNumber || !rating) {
      return res.status(400).json({ message: "ticketNumber and rating are required." });
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5." });
    }

    const ticket = await Ticket.findOne({ ticketNumber });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    if (ticket.status !== "resolved") {
      return res.status(409).json({ message: "Feedback can only be submitted for resolved tickets." });
    }

    const feedback = await Feedback.findOneAndUpdate(
      {
        ticketId: ticket._id,
        customerId: req.user.id || req.user._id,
      },
      {
        companyId: ticket.companyId,
        agentId: ticket.closedBy || ticket.assignedTo || null,
        rating: numRating,
        comment: (comment || "").slice(0, 500),
        type: "ticket",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ feedback });
  } catch (error) {
    console.error("Submit feedback error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Get Feedback for a Specific Ticket ──────────────────────
// GET /api/feedback/ticket/:ticketNumber
export const getTicketFeedback = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketNumber: req.params.ticketNumber });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const feedback = await Feedback.findOne({ ticketId: ticket._id })
      .populate("customerId", "name email")
      .lean();

    res.json({ feedback: feedback || null });
  } catch (error) {
    console.error("Get ticket feedback error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Get Agent's Average Score ───────────────────────────────
// GET /api/feedback/agent/:agentId/score
export const getAgentScore = async (req, res) => {
  try {
    const result = await Feedback.aggregate([
      { $match: { agentId: new (await import("mongoose")).default.Types.ObjectId(req.params.agentId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const stats = result[0] || { avgRating: 0, totalReviews: 0 };
    res.json({
      avgRating: Math.round(stats.avgRating * 10) / 10,
      totalReviews: stats.totalReviews,
    });
  } catch (error) {
    console.error("Get agent score error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Get My Own Satisfaction Score ────────────────────────────
// GET /api/feedback/my-score
export const getMyScore = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const result = await Feedback.aggregate([
      { $match: { agentId: new (await import("mongoose")).default.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          fiveStars: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          fourStars: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          threeStars: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          twoStars: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    const stats = result[0] || {
      avgRating: 0,
      totalReviews: 0,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStar: 0,
    };

    res.json({
      avgRating: Math.round(stats.avgRating * 10) / 10,
      totalReviews: stats.totalReviews,
      distribution: {
        5: stats.fiveStars,
        4: stats.fourStars,
        3: stats.threeStars,
        2: stats.twoStars,
        1: stats.oneStar,
      },
    });
  } catch (error) {
    console.error("Get my score error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Admin Feedback Dashboard ────────────────────────────────
// GET /api/feedback/dashboard
// Returns aggregate stats powering the Support Operations page.
export const getFeedbackDashboard = async (req, res) => {
  try {
    const mongoose = (await import("mongoose")).default;
    const companyId = req.user.companyId;

    // ── Overall CSAT ──
    const companyMatch = companyId
      ? { companyId: new mongoose.Types.ObjectId(companyId) }
      : {};

    const overallAgg = await Feedback.aggregate([
      { $match: companyMatch },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          fiveStars: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          fourStars: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          threeStars: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          twoStars: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    const overall = overallAgg[0] || {
      avgRating: 0,
      totalReviews: 0,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStar: 0,
    };

    // ── Per-Agent Scores ──
    const agentAgg = await Feedback.aggregate([
      { $match: { ...companyMatch, agentId: { $ne: null } } },
      {
        $group: {
          _id: "$agentId",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
      { $sort: { avgRating: -1 } },
      { $limit: 20 },
    ]);

    // Resolve agent names
    const agentIds = agentAgg.map((a) => a._id);
    const agents = await User.find({ _id: { $in: agentIds } })
      .select("name email")
      .lean();
    const agentMap = {};
    for (const a of agents) agentMap[a._id.toString()] = a;

    const agentScores = agentAgg.map((a) => {
      const u = agentMap[a._id.toString()];
      return {
        agentId: a._id,
        name: u?.name || u?.email || "Unknown",
        avgRating: Math.round(a.avgRating * 10) / 10,
        totalReviews: a.totalReviews,
      };
    });

    // ── Feedback Over Time (last 30 days) ──
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const timeAgg = await Feedback.aggregate([
      { $match: { ...companyMatch, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const feedbackOverTime = timeAgg.map((d) => ({
      date: d._id,
      count: d.count,
      avgRating: Math.round(d.avgRating * 10) / 10,
    }));

    // ── Recent Feedback (latest 15) ──
    const recent = await Feedback.find(companyMatch)
      .sort({ createdAt: -1 })
      .limit(15)
      .populate("customerId", "name email")
      .populate("agentId", "name email")
      .populate("ticketId", "ticketNumber subject")
      .lean();

    const recentFeedback = recent.map((f) => ({
      id: f._id,
      rating: f.rating,
      comment: f.comment,
      customerName: f.customerId?.name || f.customerId?.email || "Customer",
      agentName: f.agentId?.name || f.agentId?.email || "Unassigned",
      ticketNumber: f.ticketId?.ticketNumber || "—",
      ticketSubject: f.ticketId?.subject || "",
      createdAt: f.createdAt,
    }));

    // ── Ticket Stats (open/resolved counts for KPI cards) ──
    const ticketMatch = companyId
      ? { companyId: new mongoose.Types.ObjectId(companyId) }
      : {};

    const ticketStats = await (await import("../models/Ticket.js")).default.aggregate([
      { $match: ticketMatch },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const ticketCounts = { open: 0, "in-progress": 0, escalated: 0, resolved: 0 };
    for (const s of ticketStats) ticketCounts[s._id] = s.count;

    // ── Recent Tickets (for the queue table) ──
    const recentTickets = await (await import("../models/Ticket.js")).default
      .find(ticketMatch)
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("ticketNumber severity status assignee subject createdAt updatedAt")
      .lean();

    // ── Tickets by category (severity) for bar chart ──
    const bySeverity = await (await import("../models/Ticket.js")).default.aggregate([
      { $match: ticketMatch },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // ── Tickets over time (last 7 days, by channel) ──
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ticketsOverTime = await (await import("../models/Ticket.js")).default.aggregate([
      { $match: { ...ticketMatch, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            channel: "$channel",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);

    // Reshape into { date, email, chat, phone, web }
    const dayMap = {};
    for (const entry of ticketsOverTime) {
      const day = entry._id.day;
      if (!dayMap[day]) dayMap[day] = { date: day, email: 0, chat: 0, phone: 0, web: 0 };
      dayMap[day][entry._id.channel] = entry.count;
    }
    const ticketsByDay = Object.values(dayMap).sort((a, b) => (a.date < b.date ? -1 : 1));

    // ── Avg Response Time (rough: avg time from creation to first agent message) ──
    const resolvedTickets = await (await import("../models/Ticket.js")).default
      .find({ ...ticketMatch, status: "resolved", resolvedAt: { $ne: null } })
      .select("createdAt resolvedAt")
      .lean();

    let avgResponseMinutes = 0;
    if (resolvedTickets.length > 0) {
      const totalMins = resolvedTickets.reduce((sum, t) => {
        return sum + (new Date(t.resolvedAt) - new Date(t.createdAt)) / 60000;
      }, 0);
      avgResponseMinutes = Math.round(totalMins / resolvedTickets.length);
    }

    res.json({
      csat: {
        avgRating: Math.round(overall.avgRating * 10) / 10,
        totalReviews: overall.totalReviews,
        distribution: {
          5: overall.fiveStars,
          4: overall.fourStars,
          3: overall.threeStars,
          2: overall.twoStars,
          1: overall.oneStar,
        },
      },
      agentScores,
      feedbackOverTime,
      recentFeedback,
      ticketCounts,
      recentTickets,
      bySeverity: bySeverity.map((s) => ({ severity: s._id, count: s.count })),
      ticketsByDay,
      avgResponseMinutes,
    });
  } catch (error) {
    console.error("Feedback dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export { ADMIN_ROLES };
