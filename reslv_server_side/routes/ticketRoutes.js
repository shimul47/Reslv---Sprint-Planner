import express from "express";
import Ticket from "../models/Ticket.js";

const router = express.Router();

// Middleware to mock the authenticated user's company (replace with real auth middleware)
const mockAuth = (req, res, next) => {
  req.user = { companyId: "company_123", name: "Agent Smith" };
  next();
};

// GET /api/tickets - Fetch all tickets for the company
router.get("/", mockAuth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ companyId: req.user.companyId }).sort({
      createdAt: -1,
    });
    res.json({ tickets });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// PATCH /api/tickets/:ticketNumber - Update ticket (Resolve, Escalate, etc.)
router.patch("/:ticketNumber", mockAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber: req.params.ticketNumber, companyId: req.user.companyId },
      { $set: req.body },
      { new: true },
    );

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    // Emit event to connected frontend clients in this company's room
    req.app.get("io").to(req.user.companyId).emit("ticket:updated", ticket);

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

// POST /api/tickets/:ticketNumber/messages - Send a message
router.post("/:ticketNumber/messages", mockAuth, async (req, res) => {
  try {
    const newMessage = {
      from: "agent",
      text: req.body.text,
    };

    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber: req.params.ticketNumber, companyId: req.user.companyId },
      {
        $push: { messages: newMessage },
        $set: { lastMsg: req.body.text, status: "in-progress" }, // Auto-update lastMsg
      },
      { new: true },
    );

    req.app.get("io").to(req.user.companyId).emit("ticket:message", ticket);
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// POST /api/tickets/:ticketNumber/notes - Add an internal note
router.post("/:ticketNumber/notes", mockAuth, async (req, res) => {
  try {
    const newNote = {
      authorName: req.user.name,
      text: req.body.text,
    };

    const ticket = await Ticket.findOneAndUpdate(
      { ticketNumber: req.params.ticketNumber, companyId: req.user.companyId },
      { $push: { notes: newNote } },
      { new: true },
    );

    req.app.get("io").to(req.user.companyId).emit("ticket:note_added", ticket);
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: "Failed to add note" });
  }
});
// POST /api/tickets/public - Create a ticket from a public form
router.post("/public", async (req, res) => {
  try {
    const {
      companyId, // The public link should pass the target companyId
      subject,
      description,
      customerName,
      customerEmail,
    } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required" });
    }

    // Generate a simple ticket number (e.g., TKT-58291)
    const ticketNumber = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;

    const newTicket = new Ticket({
      ticketNumber,
      companyId,
      subject,
      channel: "web",
      status: "open",
      severity: "medium", // Default severity
      lastMsg: description,
      customer: {
        name: customerName,
        initials: customerName
          ? customerName.substring(0, 2).toUpperCase()
          : "CU",
        hue: Math.floor(Math.random() * 360),
        company: customerEmail,
      },
      messages: [
        {
          from: "customer",
          text: description,
        },
      ],
    });

    const savedTicket = await newTicket.save();

    // 🔥 THIS IS THE MAGIC: Emit to the specific company's room so agents see it instantly
    req.app.get("io").to(companyId).emit("ticket:new", savedTicket);

    res.status(201).json(savedTicket);
  } catch (error) {
    console.error("Error creating public ticket:", error);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

export default router;
