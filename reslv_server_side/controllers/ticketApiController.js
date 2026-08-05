import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import Company from "../models/Company.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "reslv_super_secret_key_1234";

function initialsFromName(name) {
  return (
    (name || "U")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

function hueFromEmail(email) {
  let hash = 0;
  for (const char of email || "") hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return 180 + (hash % 140);
}

function getPrimaryRole(user) {
  return user?.roles?.[0] || "";
}

function getTicketScope(req) {
  const role = getPrimaryRole(req.user);

  if (role === "superadmin") {
    return {};
  }

  if (role === "customer") {
    return { companyId: req.user.companyId, createdBy: req.user.id };
  }

  return { companyId: req.user.companyId };
}

function getRequestToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.split(" ")[1];
}

async function getOptionalTokenUser(req) {
  const token = getRequestToken(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.id) return null;
    return User.findById(decoded.id).lean();
  } catch (error) {
    return null;
  }
}

function formatTicket(ticket, customer, { includeInternal = true } = {}) {
  const snapshot = ticket.customerSnapshot || {};
  const messages = includeInternal
    ? ticket.messages || []
    : (ticket.messages || []).filter((message) => message.from !== "internal");

  return {
    id: ticket.ticketNumber,
    subject: ticket.subject,
    customer: {
      id: customer?._id || ticket.createdBy,
      name: snapshot.name || customer?.name || "Customer",
      email: snapshot.email || customer?.email || "",
      phone: snapshot.phone || "",
      company: snapshot.company || ticket.companyName || "",
      plan: snapshot.plan || "Starter",
      arr: snapshot.arr || "$0/yr",
      churn: snapshot.churn || "low",
      totalTickets: snapshot.totalTickets || 0,
      openTickets: snapshot.openTickets || 0,
      since: snapshot.since || "",
      initials: snapshot.initials || initialsFromName(customer?.name),
      hue: snapshot.hue || hueFromEmail(customer?.email),
    },
    severity: ticket.severity,
    channel: ticket.channel,
    assignee: ticket.assignee,
    status: ticket.status,
    slaMins: ticket.slaMins,
    slaTotal: ticket.slaTotal,
    lastMsg: ticket.lastMsg || ticket.description,
    resolvedAt: ticket.resolvedAt || null,
    tags: ticket.tags || [],
    escalationStep: ticket.escalationStep || 0,
    ts: ticket.createdAt
      ? new Date(ticket.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    thread: messages.map((message, index) => ({
      id: String(index + 1),
      from: message.from,
      text: message.text,
      agent: message.agent || snapshot.name || customer?.name || "",
      time: message.time
        ? new Date(message.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      read: Boolean(message.read),
    })),
  };
}

async function loadCompanyTicketView(ticketDoc, options = {}) {
  const customer = await User.findById(ticketDoc.createdBy).lean();
  return formatTicket(ticketDoc, customer, options);
}

function buildCustomerToken(customer) {
  return jwt.sign(
    {
      id: customer._id,
      companyId: customer.companyId,
      roles: customer.roles,
      name: customer.name,
    },
    JWT_SECRET,
    { expiresIn: "1d" },
  );
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

async function resolveTicketThread(ticket, userId = null) {
  ticket.status = "resolved";
  ticket.messages = [];
  ticket.lastMsg = "";
  ticket.resolvedAt = new Date();
  if (userId) {
    ticket.closedBy = userId;
  }
  await ticket.save();
  return ticket;
}

async function escalateTicketThread(ticket) {
  ticket.status = "escalated";
  ticket.escalationStep = Math.min((ticket.escalationStep || 0) + 1, 3);
  await ticket.save();
  return ticket;
}

async function addInternalNote(ticket, text, user) {
  ticket.messages.push({
    from: "internal",
    text,
    agent: user?.name || user?.email || "Support",
    authorId: user?.id,
    read: true,
  });
  ticket.lastMsg = text;
  await ticket.save();
  return ticket;
}

export const publicSignup = async (req, res) => {
  try {
    const { companyCode } = req.params;
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const company = await Company.findOne({
      companyCode: companyCode.toLowerCase(),
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({
      email: normalizedEmail,
      companyId: company._id,
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Account already exists. Please log in." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const customer = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      roles: ["customer"],
      companyId: company._id,
      companyName: company.name,
    });

    const token = buildCustomerToken(customer);

    res.status(201).json({
      token,
      user: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        roles: customer.roles,
        companyId: customer.companyId,
        companyName: customer.companyName,
      },
    });
  } catch (error) {
    console.error("Public signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createPublicTicket = async (req, res) => {
  try {
    const { companyCode } = req.params;
    const { name, email, password, subject, description } = req.body;

    if (!subject || !description) {
      return res
        .status(400)
        .json({ message: "Subject and description are required." });
    }

    const company = await Company.findOne({
      companyCode: companyCode.toLowerCase(),
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const tokenUser = await getOptionalTokenUser(req);
    let customer = null;

    if (
      tokenUser &&
      tokenUser.roles?.includes("customer") &&
      String(tokenUser.companyId) === String(company._id)
    ) {
      customer = tokenUser;
    } else {
      if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required." });
      }

      const normalizedEmail = normalizeEmail(email);
      customer = await User.findOne({
        email: normalizedEmail,
        companyId: company._id,
      });

      if (!customer) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        customer = await User.create({
          name,
          email: normalizedEmail,
          password: hashedPassword,
          roles: ["customer"],
          companyId: company._id,
          companyName: company.name,
        });
      } else {
        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) {
          return res
            .status(400)
            .json({ message: "Invalid email or password." });
        }
      }
    }

    const customerTickets = await Ticket.find({
      companyId: company._id,
      createdBy: customer._id,
    });
    const openTickets = customerTickets.filter((ticket) =>
      ["open", "in-progress", "escalated"].includes(ticket.status),
    ).length;

    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
    const ticket = await Ticket.create({
      ticketNumber,
      title: subject,
      subject,
      description,
      status: "open",
      severity: "medium",
      channel: "web",
      companyId: company._id,
      companyName: company.name,
      createdBy: customer._id,
      assignee: "Unassigned",
      tags: [],
      escalationStep: 0,
      slaMins: 120,
      slaTotal: 240,
      lastMsg: description,
      customerSnapshot: {
        name: customer.name,
        email: customer.email,
        phone: "",
        company: company.name,
        plan: "Starter",
        arr: "$0/yr",
        churn: "low",
        totalTickets: customerTickets.length + 1,
        openTickets: openTickets + 1,
        since: new Date(customer.createdAt || Date.now()).toLocaleDateString(),
        initials: initialsFromName(customer.name),
        hue: hueFromEmail(customer.email),
      },
      messages: [
        {
          from: "customer",
          text: description,
          agent: customer.name,
          authorId: customer._id,
          read: false,
        },
      ],
    });

    const io = req.app.get("io");
    if (io) {
      const formatted = await loadCompanyTicketView(ticket, {
        includeInternal: false,
      });
      io.to(`company:${company._id}`).emit("ticket:created", formatted);
    }

    const formattedTicket = await loadCompanyTicketView(ticket, {
      includeInternal: false,
    });

    res.status(201).json({
      token: buildCustomerToken(customer),
      user: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        roles: customer.roles,
        companyId: customer.companyId,
      },
      ticket: formattedTicket,
    });
  } catch (error) {
    console.error("Public ticket error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const publicLogin = async (req, res) => {
  try {
    const { companyCode } = req.params;
    const { email, password } = req.body;

    const company = await Company.findOne({
      companyCode: companyCode.toLowerCase(),
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const customer = await User.findOne({
      email: normalizeEmail(email),
      companyId: company._id,
    });

    if (!customer || !customer.roles?.includes("customer")) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = buildCustomerToken(customer);

    res.json({
      token,
      user: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        roles: customer.roles,
        companyId: customer.companyId,
        companyName: customer.companyName,
      },
    });
  } catch (error) {
    console.error("Public login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTickets = async (req, res) => {
  try {
    const filter = getTicketScope(req);
    const includeInternal = !req.user?.roles?.includes("customer");
    const tickets = await Ticket.find(filter).sort({ createdAt: -1 });
    const formatted = [];

    for (const ticket of tickets) {
      formatted.push(await loadCompanyTicketView(ticket, { includeInternal }));
    }

    res.json({ tickets: formatted });
  } catch (error) {
    console.error("Ticket fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      ticketNumber: req.params.ticketNumber,
      ...getTicketScope(req),
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    res.json({
      ticket: await loadCompanyTicketView(ticket, {
        includeInternal: !req.user?.roles?.includes("customer"),
      }),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const addTicketMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: "Message text is required." });
    }

    const ticket = await Ticket.findOne({
      ticketNumber: req.params.ticketNumber,
      ...getTicketScope(req),
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    if (ticket.status === "resolved") {
      return res
        .status(409)
        .json({ message: "Resolved tickets cannot be replied to." });
    }

    const role = getPrimaryRole(req.user);
    const from = role === "customer" ? "customer" : "agent";

    ticket.messages.push({
      from,
      text: text.trim(),
      agent: req.user.name || req.user.email || "Agent",
      authorId: req.user.id,
      read: false,
    });
    ticket.lastMsg = text.trim();
    await ticket.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`ticket:${ticket.ticketNumber}`).emit("ticket:message", {
        ticketNumber: ticket.ticketNumber,
        message: text.trim(),
        from,
      });
      io.to(`company:${ticket.companyId}`).emit("ticket:updated", {
        ticketNumber: ticket.ticketNumber,
      });
    }

    res.json({
      ticket: await loadCompanyTicketView(ticket, {
        includeInternal: !req.user?.roles?.includes("customer"),
      }),
    });
  } catch (error) {
    console.error("Ticket message error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const addTicketNote = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: "Note text is required." });
    }

    const ticket = await Ticket.findOne({
      ticketNumber: req.params.ticketNumber,
      ...getTicketScope(req),
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    await addInternalNote(ticket, text.trim(), req.user);

    const io = req.app.get("io");
    if (io) {
      io.to(`company:${ticket.companyId}`).emit("ticket:updated", {
        ticketNumber: ticket.ticketNumber,
      });
    }

    res.json({
      ticket: await loadCompanyTicketView(ticket),
    });
  } catch (error) {
    console.error("Ticket note error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const escalateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      ticketNumber: req.params.ticketNumber,
      ...getTicketScope(req),
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    if (ticket.status === "resolved") {
      return res
        .status(409)
        .json({ message: "Resolved tickets cannot be escalated." });
    }

    await escalateTicketThread(ticket);

    const io = req.app.get("io");
    if (io) {
      io.to(`company:${ticket.companyId}`).emit("ticket:updated", {
        ticketNumber: ticket.ticketNumber,
      });
    }

    res.json({ ticket: await loadCompanyTicketView(ticket) });
  } catch (error) {
    console.error("Ticket escalation error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const resolveTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      ticketNumber: req.params.ticketNumber,
      ...getTicketScope(req),
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    await resolveTicketThread(ticket, req.user?.id);

    const io = req.app.get("io");
    if (io) {
      io.to(`company:${ticket.companyId}`).emit("ticket:updated", {
        ticketNumber: ticket.ticketNumber,
      });
    }

    res.json({ ticket: await loadCompanyTicketView(ticket) });
  } catch (error) {
    console.error("Ticket resolve error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
