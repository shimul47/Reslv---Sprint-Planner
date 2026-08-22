import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verifies the Bearer token for the customer-facing support portal.
// Unlike requireAuth (which just attaches the decoded JWT claims), this
// fetches and attaches the full User document — publicSupportController
// reads req.user.name/email/companyId directly, not just id/roles.
export const requireCustomerAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret",
    );
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(401).json({ error: "User not found" });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid token" });
  }
};
