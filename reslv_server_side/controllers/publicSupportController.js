import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Company from "../models/Company.js";
import { createPublicTicket } from "./ticketApiController.js";

const JWT_SECRET = process.env.JWT_SECRET || "reslv_super_secret_key_1234";

export const submitSupportTicket = async (req, res) => {
  try {
    const { companyCode } = req.params;
    const { name, email, password, subject, description } = req.body;

    // Subject and description are required for all ticket submissions
    if (!subject || !description) {
      return res
        .status(400)
        .json({ message: "Subject and description are required." });
    }

    // Attempt to resolve user from req.user or Authorization header
    let authUser = req.user;

    if (!authUser && req.headers.authorization?.startsWith("Bearer ")) {
      const token = req.headers.authorization.split(" ")[1];
      try {
        authUser = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        // Token invalid/expired; treat as guest or let validation handle it
      }
    }

    // If no valid auth token is present, enforce guest signup credentials
    if (!authUser) {
      if (!name || !email || !password) {
        return res.status(400).json({
          message:
            "Name, email, and password are required for guest ticket submissions.",
        });
      }
    }

    req.params.companyCode = companyCode.toLowerCase();
    req.user = authUser;
    req.body = {
      name: authUser?.name || name,
      email: authUser?.email || email,
      password,
      subject,
      description,
    };

    return createPublicTicket(req, res);
  } catch (error) {
    console.error("Submit support ticket error:", error);
    return res.status(500).json({ message: "Server error creating ticket." });
  }
};

export const publicLogin = async (req, res) => {
  try {
    const { companyCode } = req.params;
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const company = await Company.findOne({
      companyCode: companyCode.toLowerCase(),
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      companyId: company._id,
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      {
        id: user._id,
        companyId: user.companyId,
        roles: user.roles,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        companyId: user.companyId,
      },
    });
  } catch (error) {
    console.error("Public login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};

export const publicSignup = async (req, res) => {
  try {
    const { companyCode } = req.params;
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 1. Verify the company exists
    const company = await Company.findOne({
      companyCode: companyCode.toLowerCase(),
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    // 2. Ensure user doesn't already exist for this company
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      companyId: company._id,
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email already registered for this company." });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create customer user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      roles: ["customer"],
      companyId: company._id,
      companyName: company.name,
    });

    // 5. Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        companyId: user.companyId,
        roles: user.roles,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        companyId: user.companyId,
      },
    });
  } catch (error) {
    console.error("Public signup error:", error);
    res.status(500).json({ message: "Server error during signup." });
  }
};
