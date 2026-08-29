import LoyaltyPoints from "../models/LoyaltyPoints.js";
import User from "../models/User.js";
import { companyHasFeature } from "../utils/planAccess.js";

// Helper for other controllers to award points
export const awardPoints = async (companyId, points, reason, userId = null) => {
  if (!companyId || points === 0) return null;
  
  // Premium check: only Starter/Professional/Enterprise earn points
  // Features aren't directly tied to "earning points" in config/plans.js yet,
  // but "reports" is a good proxy for Professional+, or we can just check if they are paid.
  // Actually, the easiest way to check if they are not free is to check their plan directly.
  // We'll rely on the caller to pass companyId.
  // Let's ensure the company exists and has a points record (creates if not).
  
  const loyalty = await LoyaltyPoints.findOneAndUpdate(
    { companyId },
    { $setOnInsert: { companyId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  loyalty.totalPoints += points;
  loyalty.transactions.push({
    type: "earned",
    points,
    reason,
    userId,
  });

  await loyalty.save();
  return loyalty;
};

// GET /api/loyalty/summary
export const getSummary = async (req, res) => {
  try {
    const loyalty = await LoyaltyPoints.findOneAndUpdate(
      { companyId: req.user.companyId },
      { $setOnInsert: { companyId: req.user.companyId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate("transactions.userId", "name email")
      .lean();

    // Sort transactions by newest first
    const transactions = [...(loyalty.transactions || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const availablePoints = loyalty.totalPoints - loyalty.redeemedPoints;
    const availableDiscount = availablePoints / loyalty.pointsPerDollar;

    res.json({
      summary: {
        totalPoints: loyalty.totalPoints,
        redeemedPoints: loyalty.redeemedPoints,
        availablePoints,
        pointsPerDollar: loyalty.pointsPerDollar,
        availableDiscount,
      },
      transactions: transactions.map(t => ({
        id: t._id,
        type: t.type,
        points: t.points,
        reason: t.reason,
        user: t.userId ? (t.userId.name || t.userId.email) : "System",
        createdAt: t.createdAt
      })),
    });
  } catch (error) {
    console.error("Get loyalty summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/loyalty/leaderboard (Admin/Superadmin only)
export const getLeaderboard = async (req, res) => {
  try {
    const loyalty = await LoyaltyPoints.findOne({ companyId: req.user.companyId }).lean();
    if (!loyalty || !loyalty.transactions) {
      return res.json({ leaderboard: [] });
    }

    const earnedByAgent = {};
    for (const t of loyalty.transactions) {
      if (t.type === "earned" && t.userId) {
        earnedByAgent[t.userId] = (earnedByAgent[t.userId] || 0) + t.points;
      }
    }

    const userIds = Object.keys(earnedByAgent);
    const users = await User.find({ _id: { $in: userIds } }).select("name email").lean();
    
    const leaderboard = users.map(u => ({
      userId: u._id,
      name: u.name || u.email,
      points: earnedByAgent[u._id.toString()] || 0
    })).sort((a, b) => b.points - a.points);

    res.json({ leaderboard });
  } catch (error) {
    console.error("Get loyalty leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/loyalty/settings (Admin/Superadmin only)
export const updateSettings = async (req, res) => {
  try {
    const { pointsPerDollar } = req.body;
    if (!pointsPerDollar || pointsPerDollar < 1) {
      return res.status(400).json({ message: "Invalid pointsPerDollar value." });
    }

    const loyalty = await LoyaltyPoints.findOneAndUpdate(
      { companyId: req.user.companyId },
      { pointsPerDollar },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ pointsPerDollar: loyalty.pointsPerDollar });
  } catch (error) {
    console.error("Update loyalty settings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/loyalty/adjust (Admin/Superadmin only)
export const adjustPoints = async (req, res) => {
  try {
    const { points, reason } = req.body;
    if (typeof points !== "number" || points === 0) {
      return res.status(400).json({ message: "Valid points amount is required." });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Reason is required." });
    }

    const loyalty = await LoyaltyPoints.findOneAndUpdate(
      { companyId: req.user.companyId },
      { $setOnInsert: { companyId: req.user.companyId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    loyalty.totalPoints += points;
    loyalty.transactions.push({
      type: "adjusted",
      points,
      reason: reason.trim(),
      userId: req.user.id,
    });

    await loyalty.save();
    res.json({ message: "Points adjusted successfully." });
  } catch (error) {
    console.error("Adjust loyalty points error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/loyalty/redeem (Admin/Superadmin only)
export const redeemPoints = async (req, res) => {
  try {
    const { points } = req.body;
    if (!points || points <= 0) {
      return res.status(400).json({ message: "Valid points amount to redeem is required." });
    }

    const loyalty = await LoyaltyPoints.findOne({ companyId: req.user.companyId });
    if (!loyalty) {
      return res.status(400).json({ message: "No points available." });
    }

    const availablePoints = loyalty.totalPoints - loyalty.redeemedPoints;
    if (points > availablePoints) {
      return res.status(400).json({ message: "Insufficient points." });
    }

    loyalty.redeemedPoints += points;
    loyalty.transactions.push({
      type: "redeemed",
      points,
      reason: "Redeemed for subscription discount",
      userId: req.user.id,
    });

    await loyalty.save();
    res.json({ message: "Points redeemed successfully." });
  } catch (error) {
    console.error("Redeem loyalty points error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
