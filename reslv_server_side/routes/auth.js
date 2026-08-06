import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "reslv_super_secret_key_1234";

// 1. LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate JWT Token with the role/company claims required by protected routes.
    const token = jwt.sign(
      { id: user._id, companyId: user.companyId, roles: user.roles },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        companyId: user.companyId,
        companyName: user.companyName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during login" });
  }
});

// 2. TOKEN VERIFICATION ROUTE (/api/auth/me)
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      companyId: user.companyId,
      companyName: user.companyName,
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

export default router;
