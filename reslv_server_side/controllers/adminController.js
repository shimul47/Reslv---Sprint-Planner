const bcrypt = require("bcryptjs");
const Company = require("../models/Company");
const User = require("../models/User");

exports.createTenant = async (req, res) => {
  try {
    const {
      companyName,
      companyCode, // Now pulling the unique ID from the request
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    // 1. Check if the company code is already taken
    const existingCompany = await Company.findOne({
      companyCode: companyCode.toLowerCase(),
    });
    if (existingCompany) {
      return res
        .status(400)
        .json({
          message: "Company code is already in use. Please choose another.",
        });
    }

    // 2. Check if the admin email is already registered
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Admin email already exists in the system." });
    }

    // 3. Create the new Company
    const newCompany = await Company.create({
      name: companyName,
      companyCode,
    });

    // 4. Hash the password for the new admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // 5. Create the Admin user permanently linked to the new company
    const newAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      companyId: newCompany._id,
      roles: ["admin"],
    });

    res.status(201).json({
      message: "Company and Admin created successfully!",
      company: newCompany,
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
      },
    });
  } catch (error) {
    console.error("Error creating tenant:", error);
    res.status(500).json({ message: "Server error while creating tenant" });
  }
};
