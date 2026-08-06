import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import bcrypt from "bcryptjs";
import authRoutes from "./routes/auth.js";
import superadminRoutes from "./routes/superadmin.js";
import teamRoutes from "./routes/team.js";
import inviteRoutes from "./routes/invites.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import publicSupportRoutes from "./routes/publicSupport.js";
import paymentRoutes, { handleWebhook } from "./routes/paymentRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";

import Company from "./models/Company.js";
import User from "./models/User.js";
dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  socket.on("ticket:join", (ticketNumber) => {
    if (ticketNumber) socket.join(`ticket:${ticketNumber}`);
  });

  socket.on("company:join", (companyId) => {
    if (companyId) socket.join(`company:${companyId}`);
  });
});

// Middleware
app.use(cors());
// ...
app.use("/api/calendar", calendarRoutes);
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
app.use("/api/team", teamRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/public/support", publicSupportRoutes);
app.use("/api/payments", paymentRoutes);
// Basic Route
app.get("/", (req, res) => {
  res.send("API running perfectly!");
});

// Database Connection & Server Startup
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

const seedDemoAccounts = async () => {
  const demoCompanyCode = "reslv-demo";
  let demoCompany = await Company.findOne({ companyCode: demoCompanyCode });

  if (!demoCompany) {
    demoCompany = await Company.create({
      name: "Reslv Demo Org",
      sector: "Enterprise Node",
      companyCode: demoCompanyCode,
      isActive: true,
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("demo1234", salt);

  const seedUsers = [
    {
      name: "Demo Agent",
      email: "agent@reslv.io",
      roles: ["agent"],
      companyId: demoCompany._id,
      companyName: demoCompany.name,
    },
    {
      name: "Demo Admin",
      email: "admin@reslv.io",
      roles: ["admin"],
      companyId: demoCompany._id,
      companyName: demoCompany.name,
    },
    {
      name: "Demo Super Admin",
      email: "superadmin@reslv.io",
      roles: ["superadmin"],
      companyName: demoCompany.name,
    },
  ];

  for (const seedUser of seedUsers) {
    const existingUser = await User.findOne({ email: seedUser.email });
    if (existingUser) continue;

    await User.create({
      ...seedUser,
      password: hashedPassword,
      inviteLimit: 5,
    });
  }
};

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    await seedDemoAccounts();
    console.log("MongoDB Connected Successfully");
    server.listen(PORT, () => console.log(`Server executing on port ${PORT}`));
  })
  .catch((err) => console.error("Database connection failed:", err));
