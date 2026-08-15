import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Invite from "../models/Invite.js";
import User from "../models/User.js";
import Company from "../models/Company.js";

const JWT_SECRET = process.env.JWT_SECRET || "reslv_super_secret_key_1234";

export const getInviteByToken = async (req, res) => {
  try {
    const invite = await Invite.findOne({
      token: req.params.token,
      status: "Pending",
    }).lean();

    if (!invite) {
      return res.status(404).json({ message: "Invite not found." });
    }

    res.json({ invite });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const { token, name, phone, password } = req.body;

    if (!name?.trim() || !phone?.trim() || !password) {
      return res
        .status(400)
        .json({ message: "Name, phone, and password are required." });
    }

    // No expiresAt filter here — the Invite model's TTL index on createdAt
    // already deletes the document once it's actually expired, so a
    // "Pending" invite that still exists is by definition still valid.
    const invite = await Invite.findOne({ token, status: "Pending" });

    if (!invite) {
      return res
        .status(400)
        .json({ message: "Invalid or expired invite token." });
    }

    const company = await Company.findById(invite.companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      email: invite.email,
      password: hashedPassword,
      companyId: company._id,
      companyName: company.name,
      roles: invite.roles?.length ? invite.roles : ["agent"],
      inviteLimit: invite.inviteLimit || 5,
      invitedBy: invite.invitedBy,
    });

    invite.status = "Accepted";
    await invite.save();

    const tokenValue = jwt.sign(
      { id: user._id, companyId: user.companyId, roles: user.roles },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      message: "Account created successfully.",
      token: tokenValue,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        companyId: user.companyId,
        companyName: user.companyName,
        inviteLimit: user.inviteLimit,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Invite acceptance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
