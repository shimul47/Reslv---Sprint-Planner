import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "reslv_super_secret_key_1234";

export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireRoles = (roles) => (req, res, next) => {
  if (!req.user?.roles?.some((role) => roles.includes(role))) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};
