// controllers/adminController.js
const bcrypt = require("bcrypt"); // Assuming you use bcrypt for hashing
const Company = require("../models/Company");
const User = require("../models/User");

const createTenant = async (req, res) => {
  try {
    const {
      companyName,
      companyCode,
      adminName,
      adminEmail,
      adminPassword,
      inviteLimit,
    } = req.body;

    // 1. Validate inputs (basic check)
    if (!companyName || !companyCode || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // 2. Check for existing company code or admin email to prevent duplicates
    const existingCompany = await Company.findOne({
      companyCode: companyCode.toLowerCase(),
    });
    if (existingCompany) {
      return res.status(409).json({ error: "Company code already in use." });
    }

    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return res.status(409).json({ error: "Admin email already exists." });
    }

    // 3. Create the Company
    const newCompany = await Company.create({
      name: companyName,
      companyCode: companyCode.toLowerCase(),
      isActive: true,
    });

    // 4. Hash the password and create the Admin User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const newAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      roles: ["admin"], // Assign the admin role per your schema
      companyId: newCompany._id, // Link to the newly created company
      inviteLimit: inviteLimit || 5, // Default limit if none provided
    });

    // 5. Return success response (excluding the password)
    res.status(201).json({
      message: "Tenant successfully provisioned.",
      tenant: {
        companyId: newCompany._id,
        companyName: newCompany.name,
        companyCode: newCompany.companyCode,
        adminId: newAdmin._id,
        adminEmail: newAdmin.email,
        inviteLimit: newAdmin.inviteLimit,
      },
    });
  } catch (error) {
    console.error("Error provisioning tenant:", error);
    res
      .status(500)
      .json({ error: "Internal server error during tenant creation." });
  }
};

module.exports = {
  createTenant,
};
