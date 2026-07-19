const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Invite = require("../models/Invite");
const User = require("../models/User");
const Company = require("../models/Company");
const { sendInviteEmail } = require("../utils/emailService");

exports.sendInvite = async (req, res) => {
  try {
    const { email, roles } = req.body;
    const companyId = req.user.companyId;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists." });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await Invite.findOneAndUpdate(
      { email },
      { email, companyId, roles, token, expiresAt },
      { upsert: true, new: true },
    );

    const company = await Company.findById(companyId);
    await sendInviteEmail(email, token, company.name);

    res.json({ message: "Invite sent successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.acceptInvite = async (req, res) => {
  try {
    const { token, name, password } = req.body;

    const invite = await Invite.findOne({
      token,
      expiresAt: { $gt: Date.now() },
    });
    if (!invite)
      return res
        .status(400)
        .json({ message: "Invalid or expired invite token." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      name,
      email: invite.email,
      password: hashedPassword,
      companyId: invite.companyId,
      roles: invite.roles,
    });

    await Invite.deleteOne({ _id: invite._id });

    res.json({ message: "Account created successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
