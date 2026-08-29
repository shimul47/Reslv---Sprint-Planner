import Company from "../models/Company.js";
import LoyaltyPoints from "../models/LoyaltyPoints.js";
import { getCompanyPlan } from "../utils/planAccess.js";

const DEFAULT_PRIORITIZATION_WEIGHTS = {
  ticketSeverity: { low: 1, medium: 2, high: 3, critical: 5 },
  taskPriority: { low: 1, medium: 2, high: 3 },
};

// GET /api/admin-config — a single read view for the Admin Configuration &
// System Monitoring panel's Configuration tab. Assembles settings that
// already live (and are already writable) on other controllers — this
// endpoint doesn't own any of them except prioritizationWeights.
export const getAdminConfig = async (req, res) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ message: "No company associated with this account." });
    }

    const [company, loyalty, plan] = await Promise.all([
      Company.findById(req.user.companyId)
        .select("ticketSettings defaultSprintHours workingHours prioritizationWeights")
        .lean(),
      LoyaltyPoints.findOne({ companyId: req.user.companyId }).select("pointsPerDollar").lean(),
      getCompanyPlan(req.user.companyId),
    ]);

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    res.json({
      ticketSettings: {
        slaTargets: {
          low: 1440,
          medium: 480,
          high: 120,
          critical: 30,
          ...(company.ticketSettings?.slaTargets || {}),
        },
        autoAssignOnReply: company.ticketSettings?.autoAssignOnReply ?? true,
        supportHoursNote: company.ticketSettings?.supportHoursNote || "",
      },
      sprintSettings: {
        defaultSprintHours: company.defaultSprintHours ?? 60,
        workingHours: {
          startHour: company.workingHours?.startHour ?? 9,
          endHour: company.workingHours?.endHour ?? 17,
          timezone: company.workingHours?.timezone || "Asia/Dhaka",
        },
      },
      prioritizationWeights: {
        ticketSeverity: {
          ...DEFAULT_PRIORITIZATION_WEIGHTS.ticketSeverity,
          ...(company.prioritizationWeights?.ticketSeverity || {}),
        },
        taskPriority: {
          ...DEFAULT_PRIORITIZATION_WEIGHTS.taskPriority,
          ...(company.prioritizationWeights?.taskPriority || {}),
        },
      },
      loyalty: {
        pointsPerDollar: loyalty?.pointsPerDollar ?? 100,
      },
      subscription: plan,
    });
  } catch (error) {
    console.error("Get admin config error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/admin-config/prioritization-weights
export const updatePrioritizationWeights = async (req, res) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ message: "No company associated with this account." });
    }

    const { ticketSeverity, taskPriority } = req.body;
    const update = {};

    const applyWeights = (raw, allowedKeys, field) => {
      if (!raw || typeof raw !== "object") return null;
      for (const [key, value] of Object.entries(raw)) {
        if (!allowedKeys.includes(key)) continue;
        const num = Number(value);
        if (!Number.isFinite(num) || num < 0) {
          return `Invalid weight for "${key}" — must be a non-negative number.`;
        }
        update[`prioritizationWeights.${field}.${key}`] = num;
      }
      return null;
    };

    let error = applyWeights(ticketSeverity, ["low", "medium", "high", "critical"], "ticketSeverity");
    if (!error) error = applyWeights(taskPriority, ["low", "medium", "high"], "taskPriority");
    if (error) return res.status(400).json({ message: error });

    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      { $set: update },
      { new: true },
    )
      .select("prioritizationWeights")
      .lean();

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    res.json({
      prioritizationWeights: {
        ticketSeverity: {
          ...DEFAULT_PRIORITIZATION_WEIGHTS.ticketSeverity,
          ...(company.prioritizationWeights?.ticketSeverity || {}),
        },
        taskPriority: {
          ...DEFAULT_PRIORITIZATION_WEIGHTS.taskPriority,
          ...(company.prioritizationWeights?.taskPriority || {}),
        },
      },
    });
  } catch (error) {
    console.error("Update prioritization weights error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
