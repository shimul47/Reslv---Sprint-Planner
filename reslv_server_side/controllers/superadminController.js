import Company from "../models/Company.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// ==========================================
// FETCH INITIAL DASHBOARD DATA
// ==========================================
export const getDashboardInit = async (req, res) => {
  try {
    const companies = await Company.find().lean();
    const admins = await User.find({ roles: { $in: ["admin"] } }).lean();

    res.status(200).json({ companies, admins });
  } catch (error) {
    console.error("Init Error:", error);
    res
      .status(500)
      .json({ error: "SYSTEM_FAILURE: Could not initialize data." });
  }
};

// ==========================================
// CREATE A NEW COMPANY
// ==========================================
export const createCompanyNode = async (req, res) => {
  try {
    const { name, sector, companyCode } = req.body;

    const existingCompany = await Company.findOne({
      companyCode: companyCode.toLowerCase(),
    });
    if (existingCompany) {
      return res.status(409).json({ error: "Company code already in use." });
    }

    const newCompany = await Company.create({
      name,
      sector: sector || "Enterprise Node",
      companyCode: companyCode.toLowerCase(),
      isActive: true,
    });

    res.status(201).json({ company: newCompany });
  } catch (error) {
    console.error("Company Creation Error:", error);
    res.status(400).json({ error: "PROVISION_FAILED: Invalid company data." });
  }
};

// ==========================================
// CREATE A NEW ADMIN
// ==========================================
export const createAdminNode = async (req, res) => {
  try {
    const { name, email, companyId, inviteLimit } = req.body;

    const company = await Company.findById(companyId);
    if (!company) {
      return res
        .status(404)
        .json({ error: "ORPHAN_NODE: Target company not found." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Email is already registered to a node." });
    }

    // Hash the default password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("DefaultAdminPassword123!", salt);

    const newAdmin = await User.create({
      name,
      email,
      password: hashedPassword,
      roles: ["admin"],
      companyId: company._id,
      companyName: company.name,
      inviteLimit: inviteLimit || 5,
    });

    res.status(201).json({
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        companyId: newAdmin.companyId,
        companyName: company.name,
        level: "SysOp Admin",
      },
    });
  } catch (error) {
    console.error("Admin Creation Error:", error);
    res
      .status(400)
      .json({ error: "PROVISION_FAILED: Internal database error." });
  }
};

// ==========================================
// UPDATE AN EXISTING ADMIN
// ==========================================
export const updateAdminNode = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, companyId, inviteLimit } = req.body;

    const admin = await User.findById(id);
    if (!admin || !admin.roles.includes("admin")) {
      return res.status(404).json({ error: "ORPHAN_NODE: Admin not found." });
    }

    // If email is being changed, make sure it's not taken by another user
    if (email && email !== admin.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res
          .status(409)
          .json({ error: "Email is already registered to a node." });
      }
      admin.email = email;
    }

    // If companyId is being changed, validate the new company exists
    if (companyId && companyId !== String(admin.companyId)) {
      const company = await Company.findById(companyId);
      if (!company) {
        return res
          .status(404)
          .json({ error: "ORPHAN_NODE: Target company not found." });
      }
      admin.companyId = company._id;
      admin.companyName = company.name;
    }

    if (name !== undefined) admin.name = name;
    if (inviteLimit !== undefined) admin.inviteLimit = inviteLimit;

    await admin.save();

    res.status(200).json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        companyId: admin.companyId,
        companyName: admin.companyName,
        level: "SysOp Admin",
      },
    });
  } catch (error) {
    console.error("Admin Update Error:", error);
    res
      .status(400)
      .json({ error: "UPDATE_FAILED: Invalid admin data." });
  }
};

// ==========================================
// DELETE AN ADMIN
// ==========================================
export const deleteAdminNode = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findById(id);
    if (!admin || !admin.roles.includes("admin")) {
      return res.status(404).json({ error: "ORPHAN_NODE: Admin not found." });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ message: "Admin deleted successfully.", id });
  } catch (error) {
    console.error("Admin Deletion Error:", error);
    res
      .status(500)
      .json({ error: "DELETE_FAILED: Could not remove admin." });
  }
};