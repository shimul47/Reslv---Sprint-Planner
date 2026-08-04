import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import superadminRoutes from "./routes/superadmin.js";
import paymentRoutes, { handleWebhook } from "./routes/paymentRoutes.js";
dotenv.config();

const app = express();

// Middleware
app.use(cors());

// Stripe webhook needs the RAW request body to verify the signature, so it
// must be registered BEFORE express.json() and must not go through it.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/payments", paymentRoutes);
// Basic Route
app.get("/", (req, res) => {
  res.send("API running perfectly!");
});

// Database Connection & Server Startup
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");
    app.listen(PORT, () => console.log(`Server executing on port ${PORT}`));
  })
  .catch((err) => console.error("Database connection failed:", err));
