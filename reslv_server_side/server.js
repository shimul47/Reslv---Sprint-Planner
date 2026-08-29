// Must run before any other import — ESM imports execute eagerly in
// declaration order, and several modules below (e.g. utils/mailer.js,
// imported transitively via routes/team.js) read process.env at their own
// module top-level. If dotenv.config() ran after those imports, they'd
// permanently capture undefined credentials.
import "dotenv/config";

import express from "express";
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
import sprintPlannerRoutes from "./routes/sprintPlanner.js";
import segmentRoutes from "./routes/segments.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import chatbotRoutes from "./routes/chatbot.js";

import Company from "./models/Company.js";
import User from "./models/User.js";
import Sprint from "./models/Sprint.js";
import Task from "./models/Task.js";

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
app.use("/api/sprint-planner", sprintPlannerRoutes);
app.use("/api/segments", segmentRoutes);
app.use("/api/public/support", publicSupportRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/chatbot", chatbotRoutes);
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
    {
      name: "Demo Employee",
      email: "employee@reslv.io",
      roles: ["employee"],
      companyId: demoCompany._id,
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

  await seedDemoSprintPlanner(demoCompany);
};

// Seeds one published Sprint with a couple of Tasks assigned to the Demo
// Employee — so the sprint_planner-creates/assigns/publishes ->
// employee-sees-their-task flow is testable immediately without manual setup.
const seedDemoSprintPlanner = async (demoCompany) => {
  const admin = await User.findOne({ email: "admin@reslv.io" });
  const employee = await User.findOne({ email: "employee@reslv.io" });
  if (!admin || !employee) return;

  const existingSprint = await Sprint.findOne({ companyId: demoCompany._id });
  if (existingSprint) return;

  if (demoCompany.defaultSprintHours === undefined || demoCompany.defaultSprintHours === null) {
    demoCompany.defaultSprintHours = 60;
    await demoCompany.save();
  }

  const sprint = await Sprint.create({
    companyId: demoCompany._id,
    name: "Sprint 1",
    goal: "Ship the Sprint Planner foundation.",
    status: "active",
    published: true,
    publishedAt: new Date(),
    publishedBy: admin._id,
    createdBy: admin._id,
  });

  await Task.create([
    {
      sprintId: sprint._id,
      companyId: demoCompany._id,
      title: "Review onboarding checklist",
      description: "Initial onboarding task for the demo sprint.",
      taskType: "chore",
      priority: "medium",
      assigneeId: employee._id,
      approximateHours: 4,
      position: 0,
      createdBy: admin._id,
    },
    {
      sprintId: sprint._id,
      companyId: demoCompany._id,
      title: "Fix login redirect bug",
      description: "Seeded bug task for trying out the Sprint Planner.",
      taskType: "bug",
      priority: "high",
      assigneeId: employee._id,
      approximateHours: 6,
      position: 1,
      createdBy: admin._id,
    },
  ]);
};

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    await seedDemoAccounts();
    console.log("MongoDB Connected Successfully");
    server.listen(PORT, () => console.log(`Server executing on port ${PORT}`));
  })
  .catch((err) => console.error("Database connection failed:", err));
