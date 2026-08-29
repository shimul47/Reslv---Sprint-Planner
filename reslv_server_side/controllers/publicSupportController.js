import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Company from "../models/Company.js";
import Ticket from "../models/Ticket.js";
import Feedback from "../models/Feedback.js";
import { sendTicketCreatedEmail } from "../utils/mailer.js";

// -------------------------------------------------------------
// PUBLIC COMPANY INFO (branding for the portal's pre-login/nav header)
// -------------------------------------------------------------

export const handleGetCompanyInfo = async (req, res) => {
  try {
    const { companyCode } = req.params;
    const company = await Company.findOne({ companyCode }).select(
      "name ticketSettings.supportHoursNote",
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    res.json({
      name: company.name,
      supportHoursNote: company.ticketSettings?.supportHoursNote || "",
    });
  } catch (error) {
    console.error("Public company info error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------------------------------------------------
// AUTHENTICATION (SIGNUP & LOGIN)
// -------------------------------------------------------------

export const handleSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { companyCode } = req.params;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required fields." });
    }

    let company = null;
    if (companyCode) {
      company = await Company.findOne({ companyCode });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({
      name: name || email.split("@")[0],
      email,
      password: hashedPassword,
      roles: ["customer"],
      companyId: company ? company._id : null,
      companyName: company ? company.name : null,
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, roles: user.roles },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error("Public Signup Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

export const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, roles: user.roles },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error("Public Login Error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};

// -------------------------------------------------------------
// PUBLIC TICKETS MANAGEMENT
// -------------------------------------------------------------

// GET ALL TICKETS FOR LOGGED IN CUSTOMER
// GET /api/public/support/:companyCode/tickets
export const handleGetTickets = async (req, res) => {
  try {
    const { companyCode } = req.params;

    // Resolve target company
    let targetCompany = null;
    if (companyCode) {
      targetCompany = await Company.findOne({ companyCode });
    }

    if (!targetCompany && req.user.companyId) {
      targetCompany = await Company.findById(req.user.companyId);
    }

    if (!targetCompany) {
      return res.status(404).json({ message: "Company not found." });
    }

    // Filter tickets created ONLY by this authenticated user for this company
    const tickets = await Ticket.find({
      companyId: targetCompany._id,
      createdBy: req.user._id, // Key fix: restricts results to logged-in user
    }).sort({ updatedAt: -1 });

    res.json({ tickets });
  } catch (error) {
    console.error("Fetch User Tickets Error:", error);
    res.status(500).json({ message: "Failed to fetch support tickets." });
  }
};

// GET SINGLE TICKET DETAILS
export const handleGetSingleTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(ticketId);
    const query = isObjectId
      ? { $or: [{ ticketNumber: ticketId }, { _id: ticketId }] }
      : { ticketNumber: ticketId };
    const ticket = await Ticket.findOne(query);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json({ ticket });
  } catch (error) {
    console.error("Fetch Single Ticket Error:", error);
    res.status(500).json({ message: "Failed to fetch ticket." });
  }
};

// CREATE TICKET
export const handleCreateTicket = async (req, res) => {
  try {
    const { companyCode } = req.params;
    const { subject, description } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        message: "Subject and description are required fields.",
      });
    }

    // Resolve target company
    let targetCompany = null;
    if (companyCode) {
      targetCompany = await Company.findOne({ companyCode });
    }

    if (!targetCompany && req.user.companyId) {
      targetCompany = await Company.findById(req.user.companyId);
    }

    if (!targetCompany && req.body.companyId) {
      targetCompany = await Company.findById(req.body.companyId);
    }

    if (!targetCompany) {
      return res.status(400).json({
        message: `Company with code '${companyCode}' was not found.`,
      });
    }

    const ticketNumber = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;

    // Match exact Schema paths
    const newTicket = new Ticket({
      ticketNumber,
      title: subject, // Satisfies required 'title' schema path
      subject: subject, // Satisfies required 'subject' schema path
      description,
      channel: "web",
      status: "open",
      severity: "medium",
      companyId: targetCompany._id,
      createdBy: req.user._id, // Satisfies required 'createdBy' schema path
      lastMsg: description,
      customerSnapshot: {
        name: req.user.name || req.user.email.split("@")[0],
        email: req.user.email,
        company: targetCompany.name || req.user.email,
        initials: (req.user.name || req.user.email)
          .substring(0, 2)
          .toUpperCase(),
        hue: Math.floor(Math.random() * 360),
      },
      messages: [
        {
          from: "customer",
          text: description,
          authorId: req.user._id,
          time: new Date(),
        },
      ],
    });

    const savedTicket = await newTicket.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`company:${targetCompany._id}`).emit("ticket:new", savedTicket);
    }

    sendTicketCreatedEmail(req.user.email, {
      ticketNumber,
      subject,
      companyName: targetCompany.name,
    });

    res.status(201).json({ ticket: savedTicket });
  } catch (error) {
    console.error("Public Create Ticket Error Detail:", error);

    if (error.name === "ValidationError") {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return res.status(400).json({
        message: "Ticket schema validation failed",
        errors,
      });
    }

    res.status(500).json({
      message: "Failed to create support ticket.",
      error: error.message,
    });
  }
};

// ADD REPLY MESSAGE TO TICKET
export const handleSendMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const ticket = await Ticket.findOne({
      $or: [{ ticketNumber: ticketId }, { _id: ticketId }],
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const messageObj = {
      from: "customer",
      text,
      authorId: req.user._id,
      time: new Date(),
    };

    ticket.messages.push(messageObj);
    ticket.lastMsg = text;
    ticket.updatedAt = new Date();

    const updatedTicket = await ticket.save();

    const io = req.app.get("io");
    if (io) {
      // Server always prefixes "ticket:join" rooms with "ticket:" (see
      // server.js), so this must match that room name, not the bare id —
      // otherwise other tabs/sessions on this same ticket never see the push.
      const portalRoom = `ticket:${updatedTicket._id.toString()}`;
      io.to(portalRoom).emit("ticket:message", messageObj);
      io.to(portalRoom).emit("ticket:updated", updatedTicket);
      // Agent-side room: thread-item shape (formatted time string), matching
      // what the agent inbox's ticket:message listener expects.
      const formattedMessage = {
        id: String(updatedTicket.messages.length),
        from: "customer",
        text,
        agent: req.user.name || req.user.email || "Customer",
        time: new Date(messageObj.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        read: false,
      };
      io.to(`ticket:${updatedTicket.ticketNumber}`).emit("ticket:message", {
        ticketNumber: updatedTicket.ticketNumber,
        message: formattedMessage,
      });
      io.to(`company:${updatedTicket.companyId}`).emit("ticket:updated", {
        ticketNumber: updatedTicket.ticketNumber,
      });
    }

    res.json({ ticket: updatedTicket });
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ message: "Failed to send message." });
  }
};

// -------------------------------------------------------------
// CUSTOMER FEEDBACK ON RESOLVED TICKETS
// -------------------------------------------------------------

// POST /api/public/support/:companyCode/tickets/:ticketId/feedback
export const handleSubmitFeedback = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({ message: "Rating is required." });
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(ticketId);
    const query = isObjectId
      ? { $or: [{ ticketNumber: ticketId }, { _id: ticketId }] }
      : { ticketNumber: ticketId };
    const ticket = await Ticket.findOne(query);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    if (ticket.status !== "resolved") {
      return res.status(409).json({ message: "Feedback can only be given for resolved tickets." });
    }

    const feedback = await Feedback.findOneAndUpdate(
      {
        ticketId: ticket._id,
        customerId: req.user._id,
      },
      {
        companyId: ticket.companyId,
        agentId: ticket.closedBy || ticket.assignedTo || null,
        rating: numRating,
        comment: (comment || "").slice(0, 500),
        type: "ticket",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ feedback });
  } catch (error) {
    console.error("Submit feedback error:", error);
    res.status(500).json({ message: "Failed to submit feedback." });
  }
};

// GET /api/public/support/:companyCode/tickets/:ticketId/feedback
export const handleGetTicketFeedback = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(ticketId);
    const query = isObjectId
      ? { $or: [{ ticketNumber: ticketId }, { _id: ticketId }] }
      : { ticketNumber: ticketId };
    const ticket = await Ticket.findOne(query);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const feedback = await Feedback.findOne({
      ticketId: ticket._id,
      customerId: req.user._id,
    }).lean();

    res.json({ feedback: feedback || null });
  } catch (error) {
    console.error("Get ticket feedback error:", error);
    res.status(500).json({ message: "Failed to fetch feedback." });
  }
};
