import crypto from "crypto";
import User from "../models/User.js";
import Invite from "../models/Invite.js";
import Company from "../models/Company.js";
import Subscription from "../models/Subscription.js";
import Segment from "../models/Segment.js";
import { sendInviteEmail } from "../utils/mailer.js";
import { getCompanyPlan, companyHasFeature } from "../utils/planAccess.js";
import { resolveCompanyId } from "../utils/companyScope.js";

const PRIVILEGED_ROLES = ["admin", "superadmin"];

function hasPrivilegedRole(roles = []) {
  return roles.some((r) => PRIVILEGED_ROLES.includes(r));
}

// Company-wide seat usage: every non-customer user in the company, plus any
// invite still pending, counted against the company's shared invite pool
// (not per-inviter — a company's admins all draw from one cap).
async function getCompanyInviteUsage(companyId) {
  return (
    (await User.countDocuments({ companyId, roles: { $ne: "customer" } })) +
    (await Invite.countDocuments({ companyId, status: "Pending" }))
  );
}

export const getTeamMembers = async (req, res) => {
  try {
    const isSuperAdmin = req.user.roles?.includes("superadmin");
    const companyId = req.user.companyId;

    // The requester manages the team but isn't a manageable row themselves.
    const userFilter = isSuperAdmin
      ? { _id: { $ne: req.user.id } }
      : { companyId, _id: { $ne: req.user.id } };
    const inviteFilter = isSuperAdmin
      ? { status: "Pending" }
      : { companyId, status: "Pending" };

    const users = await User.find(userFilter).select("-password").lean();
    const invites = await Invite.find(inviteFilter).lean();
    const companies = isSuperAdmin
      ? await Company.find().lean()
      : companyId
        ? [await Company.findById(companyId).lean()]
        : [];

    const formattedUsers = users
      .filter((user) => !user.roles?.includes("customer"))
      .map((user) => ({
        id: user._id,
        type: "user",
        name: user.name || "Unknown User",
        email: user.email,
        roles: user.roles || [],
        status: "Active",
        inviteLimit: user.inviteLimit || 5,
        segmentId: user.segmentId ?? null,
      }));

    const formattedInvites = invites.map((invite) => {
      const company = companies.find(
        (item) => String(item?._id) === String(invite.companyId),
      );
      return {
        id: invite._id,
        type: "invite",
        name: "Pending User",
        email: invite.email,
        roles: invite.roles || [],
        status: invite.status,
        companyId: invite.companyId,
        companyName: company?.name || "",
      };
    });

    const usedInvites = isSuperAdmin
      ? formattedInvites.length
      : await getCompanyInviteUsage(companyId);
    const plan = isSuperAdmin ? null : await getCompanyPlan(companyId);

    res.status(200).json({
      team: [...formattedUsers, ...formattedInvites],
      inviteLimit: plan?.inviteLimit ?? null,
      inviteUsage: usedInvites,
      plan,
    });
  } catch (error) {
    console.error("Error fetching team data:", error);
    res.status(500).json({ message: "Failed to load team data." });
  }
};

export const inviteTeamMember = async (req, res) => {
  try {
    const {
      email,
      roles,
      companyId: requestedCompanyId,
      inviteLimit,
    } = req.body;
    const isSuperAdmin = req.user.roles?.includes("superadmin");
    const companyId = isSuperAdmin ? requestedCompanyId : req.user.companyId;

    if (!email || !Array.isArray(roles) || roles.length === 0) {
      return res
        .status(400)
        .json({ message: "Email and at least one role are required." });
    }

    if (!companyId) {
      return res.status(400).json({ message: "Company is required." });
    }

    // Only a superadmin may hand out the admin role — everyone else invites
    // within their own company at a non-privileged level.
    if (!isSuperAdmin && roles.includes("admin")) {
      return res
        .status(403)
        .json({ message: "Only a superadmin can invite an admin." });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const inviter = await User.findById(req.user.id);
    if (!isSuperAdmin) {
      const plan = await getCompanyPlan(companyId);
      const usage = await getCompanyInviteUsage(companyId);

      if (plan.inviteLimit !== null && usage >= plan.inviteLimit) {
        return res.status(403).json({
          message: "Invite limit reached. Upgrade your plan to invite more teammates.",
          upgradeRequired: true,
        });
      }

      if (roles.includes("sprint_planner") && !plan.features.sprintPlannerInvite) {
        return res.status(403).json({
          message: "Inviting a Sprint Planner requires the Professional plan or higher.",
          upgradeRequired: "professional",
        });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const token = crypto.randomBytes(32).toString("hex");

    // Only a superadmin-issued admin invite carries a custom limit — it sets
    // a company-wide override on that company's Subscription (e.g. a comp'd
    // allowance while bootstrapping a new company), not a per-user cap.
    if (isSuperAdmin && inviteLimit) {
      await Subscription.findOneAndUpdate(
        { companyId },
        { inviteLimitOverride: inviteLimit },
        { upsert: true },
      );
    }

    const invite = await Invite.findOneAndUpdate(
      { email: email.toLowerCase(), companyId },
      {
        email: email.toLowerCase(),
        companyId,
        roles,
        inviteLimit: isSuperAdmin && inviteLimit ? inviteLimit : null,
        token,
        invitedBy: req.user.id,
        invitedByEmail: inviter?.email || "",
        status: "Pending",
      },
      { upsert: true, new: true },
    );

    await sendInviteEmail(email, roles.join(", "), token, company.name);

    res.json({ message: "Invite sent successfully.", invite });
  } catch (error) {
    console.error("Invite Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateMemberRoles = async (req, res) => {
  try {
    const { roles } = req.body;
    if (!Array.isArray(roles) || roles.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one role is required." });
    }

    const isSuperAdmin = req.user.roles?.includes("superadmin");
    const target = await User.findById(req.params.userId);
    if (!target) {
      return res.status(404).json({ message: "Team member not found." });
    }

    if (!isSuperAdmin) {
      if (String(target.companyId) !== String(req.user.companyId)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      // A company admin can shuffle non-privileged roles among their own
      // team, but can't grant/revoke admin-level access either direction.
      if (hasPrivilegedRole(target.roles) || hasPrivilegedRole(roles)) {
        return res
          .status(403)
          .json({ message: "Only a superadmin can manage admin-level roles." });
      }
    }

    target.roles = roles;
    await target.save();

    res.json({
      member: {
        id: target._id,
        name: target.name,
        email: target.email,
        roles: target.roles,
      },
    });
  } catch (error) {
    console.error("Update member roles error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeMember = async (req, res) => {
  try {
    const isSuperAdmin = req.user.roles?.includes("superadmin");
    const target = await User.findById(req.params.userId);
    if (!target) {
      return res.status(404).json({ message: "Team member not found." });
    }

    if (String(target._id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot remove yourself." });
    }

    if (!isSuperAdmin) {
      if (String(target.companyId) !== String(req.user.companyId)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (hasPrivilegedRole(target.roles)) {
        return res
          .status(403)
          .json({ message: "Only a superadmin can remove an admin." });
      }
    }

    await User.findByIdAndDelete(req.params.userId);
    res.json({ message: "Team member removed.", id: req.params.userId });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const revokeInvite = async (req, res) => {
  try {
    const isSuperAdmin = req.user.roles?.includes("superadmin");
    const invite = await Invite.findById(req.params.inviteId);
    if (!invite) {
      return res.status(404).json({ message: "Invite not found." });
    }
    if (!isSuperAdmin && String(invite.companyId) !== String(req.user.companyId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    invite.status = "Revoked";
    await invite.save();
    res.json({ message: "Invite revoked.", id: invite._id });
  } catch (error) {
    console.error("Revoke invite error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Sprint Planner Administration: capacity settings ────────────────────────

export const getSprintPlannerSettings = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }

    const company = await Company.findById(companyId).select("defaultSprintHours workingHours").lean();
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    res.json({
      defaultSprintHours: company.defaultSprintHours ?? 60,
      workingHours: {
        startHour: company.workingHours?.startHour ?? 9,
        endHour: company.workingHours?.endHour ?? 17,
        timezone: company.workingHours?.timezone || "Asia/Dhaka",
      },
    });
  } catch (error) {
    console.error("Get sprint planner settings error:", error);
    res.status(500).json({ message: "Failed to load settings." });
  }
};

export const updateSprintPlannerSettings = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }

    const { defaultSprintHours, workingHours } = req.body;
    const update = {};

    if (defaultSprintHours !== undefined) {
      if (Number(defaultSprintHours) < 0) {
        return res.status(400).json({ message: "defaultSprintHours must be a non-negative number." });
      }
      update.defaultSprintHours = Number(defaultSprintHours);
    }

    if (workingHours !== undefined) {
      const { startHour, endHour, timezone } = workingHours;
      if (
        startHour === undefined || endHour === undefined ||
        Number(startHour) < 0 || Number(startHour) > 23 ||
        Number(endHour) < 1 || Number(endHour) > 24 ||
        Number(startHour) >= Number(endHour)
      ) {
        return res.status(400).json({ message: "Working hours must be a valid start/end (start before end, 0–24)." });
      }
      update["workingHours.startHour"] = Number(startHour);
      update["workingHours.endHour"] = Number(endHour);
      update["workingHours.timezone"] = timezone?.trim() || "Asia/Dhaka";
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nothing to update." });
    }

    const company = await Company.findByIdAndUpdate(companyId, { $set: update }, { new: true })
      .select("defaultSprintHours workingHours")
      .lean();
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    res.json({
      defaultSprintHours: company.defaultSprintHours,
      workingHours: company.workingHours,
    });
  } catch (error) {
    console.error("Update sprint planner settings error:", error);
    res.status(500).json({ message: "Failed to update settings." });
  }
};

// Assigns an employee to a team/department segment — null clears it
// (unassigned). Segment must belong to the same company being managed.
export const updateMemberSegment = async (req, res) => {
  try {
    const { segmentId } = req.body;

    const isSuperAdmin = req.user.roles?.includes("superadmin");
    const target = await User.findById(req.params.userId);
    if (!target) {
      return res.status(404).json({ message: "Team member not found." });
    }
    if (!isSuperAdmin && String(target.companyId) !== String(req.user.companyId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (segmentId) {
      const segment = await Segment.findOne({ _id: segmentId, companyId: target.companyId }).lean();
      if (!segment) {
        return res.status(404).json({ message: "Segment not found." });
      }
    }

    target.segmentId = segmentId || null;
    await target.save();

    res.json({ id: target._id, segmentId: target.segmentId });
  } catch (error) {
    console.error("Update member segment error:", error);
    res.status(500).json({ message: "Failed to update segment." });
  }
};
