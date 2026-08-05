import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Invite from "../models/Invite.js";
import Company from "../models/Company.js";
import { sendInviteEmail } from "../utils/mailer.js";

function canCountAgainstLimit(role) {
  return ["admin", "agent", "developer", "employee"].includes(role);
}

export const getTeamMembers = async (req, res) => {
  try {
    const isSuperAdmin = req.user.roles?.includes("superadmin");
    const companyId = req.user.companyId;

    const userFilter = isSuperAdmin ? {} : { companyId };
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
      .map((user) => {
        const role = Array.isArray(user.roles) ? user.roles[0] : user.role;
        return {
          id: user._id,
          name: user.name || "Unknown User",
          email: user.email,
          role: role || "agent",
          status: "Active",
          inviteLimit: user.inviteLimit || 5,
        };
      });

    const formattedInvites = invites.map((invite) => {
      const company = companies.find(
        (item) => String(item?._id) === String(invite.companyId),
      );
      return {
        id: invite._id,
        name: "Pending User",
        email: invite.email,
        role: invite.role,
        status: invite.status,
        companyId: invite.companyId,
        companyName: company?.name || "",
      };
    });

    const admin = await User.findById(req.user.id).lean();
    const usedInvites = isSuperAdmin
      ? formattedInvites.length
      : (await User.countDocuments({ invitedBy: req.user.id })) +
        (await Invite.countDocuments({
          invitedBy: req.user.id,
          status: "Pending",
        }));

    res.status(200).json({
      team: [...formattedUsers, ...formattedInvites],
      inviteLimit: admin?.inviteLimit || 5,
      inviteUsage: usedInvites,
    });
  } catch (error) {
    console.error("Error fetching team data:", error);
    res.status(500).json({ message: "Failed to load team data." });
  }
};

export const inviteTeamMember = async (req, res) => {
  try {
    const { email, role, companyId: requestedCompanyId } = req.body;
    const isSuperAdmin = req.user.roles?.includes("superadmin");
    const companyId = isSuperAdmin ? requestedCompanyId : req.user.companyId;

    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required." });
    }

    if (!companyId) {
      return res.status(400).json({ message: "Company is required." });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const inviter = await User.findById(req.user.id);
    if (!isSuperAdmin) {
      const usage =
        (await User.countDocuments({ invitedBy: req.user.id })) +
        (await Invite.countDocuments({
          invitedBy: req.user.id,
          status: "Pending",
        }));

      if (inviter && usage >= (inviter.inviteLimit || 5)) {
        return res.status(403).json({ message: "Invite limit reached." });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await Invite.findOneAndUpdate(
      { email: email.toLowerCase(), companyId },
      {
        email: email.toLowerCase(),
        companyId,
        role,
        token,
        invitedBy: req.user.id,
        invitedByEmail: inviter?.email || "",
        status: "Pending",
        expiresAt,
      },
      { upsert: true, new: true },
    );

    await sendInviteEmail(email, role, token, company.name);

    res.json({ message: "Invite sent successfully.", invite });
  } catch (error) {
    console.error("Invite Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
