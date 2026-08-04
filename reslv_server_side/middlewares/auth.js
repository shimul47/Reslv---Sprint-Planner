import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "reslv_super_secret_key_1234";

// Verifies the Bearer token from routes/auth.js's login route and attaches
// { id, companyId, roles } to req.user. Reuses the same secret/shape auth.js
// already signs tokens with.
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, companyId?, roles?, iat, exp }
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default protect;
