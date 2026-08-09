import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import Company from "../models/Company.js";
import { companyHasFeature } from "../utils/planAccess.js";

// The ticket system is agent-only among non-admin roles — employee and
// sprint_planner have their own dedicated areas instead.
const AGENT_ROLES = ["superadmin", "admin", "agent"];

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

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

const DEFAULT_TICKET_SETTINGS = {
  slaTargets: { low: 1440, medium: 480, high: 120, critical: 30 },
  autoAssignOnReply: true,
  supportHoursNote: "",
};

// Merges a company's stored ticketSettings over the defaults so companies
// created before this feature (or with partially-set fields) still work.
async function getCompanySettings(companyId) {
  if (!companyId) return DEFAULT_TICKET_SETTINGS;
  const company = await Company.findById(companyId).select("ticketSettings").lean();
  const stored = company?.ticketSettings || {};
  return {
    slaTargets: { ...DEFAULT_TICKET_SETTINGS.slaTargets, ...(stored.slaTargets || {}) },
    autoAssignOnReply:
      stored.autoAssignOnReply === undefined
        ? DEFAULT_TICKET_SETTINGS.autoAssignOnReply
        : stored.autoAssignOnReply,
    supportHoursNote: stored.supportHoursNote || DEFAULT_TICKET_SETTINGS.supportHoursNote,
  };
}

// SLA is computed live from the target (by severity) and elapsed time since
// creation, rather than trusting the ticket's stored slaMins/slaTotal, which
// were only ever written once at creation and never actually counted down.
function computeSla(ticket, slaTargets) {
  const total = slaTargets?.[ticket.severity] ?? DEFAULT_TICKET_SETTINGS.slaTargets.medium;
  if (ticket.status === "resolved") {
    return { slaMins: total, slaTotal: total };
  }
  const elapsedMins = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000);
  return { slaMins: Math.max(0, total - elapsedMins), slaTotal: total };
}

function getTicketScope(req) {
  const role = getPrimaryRole(req.user);

  if (role === "superadmin") {
    return {};
  }

  if (role === "customer") {
    return { companyId: req.user.companyId, createdBy: req.user.id };
  }

  if (role === "admin") {
    return { companyId: req.user.companyId };
  }

  // agent (the only non-admin role with ticket access): the shared
  // unassigned pool for anything still active, plus every ticket assigned
  // to me regardless of status — so a resolved-but-unclaimed ticket doesn't
  // show up as "mine" once it's done (admin/superadmin see all of these
  // via the unrestricted scopes above).
  return {
    companyId: req.user.companyId,
    $or: [
      { assignedTo: req.user.id },
      { assignedTo: null, status: { $ne: "resolved" } },
    ],
  };
}

// JWTs issued by routes/auth.js only embed { id, companyId, roles } — no
// display name — so any handler that needs the acting user's name/email
// (message authorship, assignment) resolves it from the DB once.
async function resolveActingUser(req) {
  if (req.user?.name) return req.user;
  const dbUser = await User.findById(req.user.id).select("name email").lean();
  return dbUser ? { ...req.user, name: dbUser.name, email: dbUser.email } : req.user;
}

function formatTicket(
  ticket,
  customer,
  { includeInternal = true, companyFallback = "", slaTargets = null } = {},
) {
  const snapshot = ticket.customerSnapshot || {};
  const messages = includeInternal
    ? ticket.messages || []
    : (ticket.messages || []).filter((message) => message.from !== "internal");
  const sla = computeSla(ticket, slaTargets || DEFAULT_TICKET_SETTINGS.slaTargets);
  // Unread from the agent's perspective: customer messages no agent has opened yet.
  const unreadCount = (ticket.messages || []).filter(
    (message) => message.from === "customer" && !message.read,
  ).length;

  return {
    id: ticket.ticketNumber,
    subject: ticket.subject,
    customer: {
      id: customer?._id || ticket.createdBy,
      name: snapshot.name || customer?.name || "Customer",
      email: snapshot.email || customer?.email || "",
      phone: snapshot.phone || "",
      company: snapshot.company || companyFallback || "",
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
    assignedTo: ticket.assignedTo || null,
    status: ticket.status,
    slaMins: sla.slaMins,
    slaTotal: sla.slaTotal,
    lastMsg: ticket.lastMsg || ticket.description,
    resolvedAt: ticket.resolvedAt || null,
    tags: ticket.tags || [],
    unreadCount,
    escalationStep: ticket.escalationStep || 0,
    ts: ticket.updatedAt || ticket.createdAt
      ? new Date(ticket.updatedAt || ticket.createdAt).toLocaleTimeString([], {
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
  let slaTargets = options.slaTargets;
  if (!slaTargets) {
    const settings = await getCompanySettings(ticketDoc.companyId);
    slaTargets = settings.slaTargets;
  }
  return formatTicket(ticketDoc, customer, { ...options, slaTargets });
}

async function resolveTicketThread(ticket, userId = null) {
  ticket.status = "resolved";
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

async function addInternalNote(ticket, text, actingUser) {
  ticket.messages.push({
    from: "internal",
    text,
    agent: actingUser?.name || actingUser?.email || "Support",
    authorId: actingUser?.id,
    read: true,
  });
  ticket.lastMsg = text;
  await ticket.save();
  return ticket;
}

function emitTicketUpdated(req, ticket) {
  const io = req.app.get("io");
  if (io) {
    io.to(`company:${ticket.companyId.toString()}`).emit("ticket:updated", {
      ticketNumber: ticket.ticketNumber,
    });
  }
}

// Minimal agent roster for the assign-to picker — deliberately separate from
// GET /api/team (admin/superadmin-only, carries invite/PII data agents shouldn't see).
export const listAssignableAgents = async (req, res) => {
  try {
    const agents = await User.find({
      companyId: req.user.companyId,
      roles: { $in: AGENT_ROLES },
    })
      .select("name email roles")
      .lean();

    res.json({
      agents: agents.map((agent) => ({
        id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.roles?.[0] || "agent",
      })),
    });
  } catch (error) {
    console.error("List assignable agents error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTickets = async (req, res) => {
  try {
    const filter = getTicketScope(req);
    const includeInternal = !req.user?.roles?.includes("customer");
    // Most recently active ticket (new message, status/assignment change) first.
    const tickets = await Ticket.find(filter).sort({ updatedAt: -1 });
    // Fetch once and reuse for every ticket instead of a lookup per ticket.
    const { slaTargets } = await getCompanySettings(req.user.companyId);
    const formatted = [];

    for (const ticket of tickets) {
      formatted.push(await loadCompanyTicketView(ticket, { includeInternal, slaTargets }));
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

    let companyFallback = "";
    if (!ticket.customerSnapshot?.company && ticket.companyId) {
      const company = await Company.findById(ticket.companyId).lean();
      companyFallback = company?.name || "";
    }
    const { slaTargets } = await getCompanySettings(ticket.companyId);

    res.json({
      ticket: await loadCompanyTicketView(ticket, {
        includeInternal: !req.user?.roles?.includes("customer"),
        companyFallback,
        slaTargets,
      }),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createTicket = async (req, res) => {
  try {
    const {
      subject,
      description,
      severity,
      channel,
      customerName,
      customerEmail,
      assigneeId,
    } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ message: "Subject and description are required." });
    }

    const company = await Company.findById(req.user.companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    let customer = null;
    if (customerEmail) {
      customer = await User.findOne({
        email: normalizeEmail(customerEmail),
        companyId: company._id,
      }).lean();
    }

    let assignedTo = null;
    let assignee = "Unassigned";
    if (assigneeId) {
      const agentUser = await User.findById(assigneeId).select("name email").lean();
      if (agentUser) {
        assignedTo = assigneeId;
        assignee = agentUser.name || agentUser.email || "Agent";
      }
    }

    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
    const displayName = customer?.name || customerName || "Customer";
    const displayEmail = customer?.email || customerEmail || "";

    const ticket = await Ticket.create({
      ticketNumber,
      title: subject,
      subject,
      description,
      status: "open",
      severity: severity || "medium",
      channel: channel || "web",
      companyId: company._id,
      createdBy: customer?._id || req.user.id,
      assignedTo,
      assignee,
      lastMsg: description,
      customerSnapshot: {
        name: displayName,
        email: displayEmail,
        company: company.name,
        initials: initialsFromName(displayName),
        hue: hueFromEmail(displayEmail),
      },
      messages: [
        {
          from: "customer",
          text: description,
          agent: displayName,
          authorId: customer?._id || null,
          read: false,
        },
      ],
    });

    const io = req.app.get("io");
    if (io) {
      const formatted = await loadCompanyTicketView(ticket);
      io.to(`company:${company._id.toString()}`).emit("ticket:created", formatted);
    }

    res.status(201).json({ ticket: await loadCompanyTicketView(ticket) });
  } catch (error) {
    console.error("Ticket creation error:", error);
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
    const actingUser = await resolveActingUser(req);
    const displayName = actingUser.name || actingUser.email || "Agent";

    const newMessage = {
      from,
      text: text.trim(),
      agent: displayName,
      authorId: req.user.id,
      read: false,
    };
    ticket.messages.push(newMessage);
    ticket.lastMsg = text.trim();

    // Auto-claim: the first agent to reply to an unassigned ticket becomes
    // its owner, taking it out of the shared pool for other agents —
    // unless the company has turned this behavior off in Settings.
    if (from === "agent" && !ticket.assignedTo) {
      const { autoAssignOnReply } = await getCompanySettings(ticket.companyId);
      if (autoAssignOnReply) {
        ticket.assignedTo = req.user.id;
        ticket.assignee = displayName;
      }
    }

    await ticket.save();
    const savedMessage = ticket.messages[ticket.messages.length - 1];

    const io = req.app.get("io");
    if (io) {
      // Agent-side room: thread-item shape (formatted time string), matches
      // what formatTicket() would have produced for this message.
      const formattedMessage = {
        id: String(ticket.messages.length),
        from,
        text: newMessage.text,
        agent: displayName,
        time: savedMessage.time
          ? new Date(savedMessage.time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
        read: false,
      };
      io.to(`ticket:${ticket.ticketNumber}`).emit("ticket:message", {
        ticketNumber: ticket.ticketNumber,
        message: formattedMessage,
      });
      // Portal room (keyed by raw Mongo id): raw schema shape, matching
      // what SupportPortalPage expects (unformatted Date, from/text/agent).
      // Server always prefixes "ticket:join" rooms with "ticket:" (see
      // server.js), so the room name must match that, not the bare id.
      io.to(`ticket:${ticket._id.toString()}`).emit("ticket:message", savedMessage);
      io.to(`company:${ticket.companyId.toString()}`).emit("ticket:updated", {
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

// Called when an agent opens a ticket — clears its unread badge/bold state.
export const markTicketRead = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      ticketNumber: req.params.ticketNumber,
      ...getTicketScope(req),
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    let changed = false;
    for (const message of ticket.messages) {
      if (message.from === "customer" && !message.read) {
        message.read = true;
        changed = true;
      }
    }

    if (changed) {
      await ticket.save();
      emitTicketUpdated(req, ticket);
    }

    res.json({ ticket: await loadCompanyTicketView(ticket) });
  } catch (error) {
    console.error("Mark ticket read error:", error);
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

    const actingUser = await resolveActingUser(req);
    await addInternalNote(ticket, text.trim(), { ...actingUser, id: req.user.id });

    emitTicketUpdated(req, ticket);

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
    emitTicketUpdated(req, ticket);

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
    emitTicketUpdated(req, ticket);

    res.json({ ticket: await loadCompanyTicketView(ticket) });
  } catch (error) {
    console.error("Ticket resolve error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const PATCHABLE_FIELDS = ["severity", "status", "tags"];

export const patchTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      ticketNumber: req.params.ticketNumber,
      ...getTicketScope(req),
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    for (const field of PATCHABLE_FIELDS) {
      if (field in req.body) {
        ticket[field] = req.body[field];
      }
    }

    // Reopening a resolved ticket clears its resolution markers.
    if (req.body.status && req.body.status !== "resolved" && ticket.resolvedAt) {
      ticket.resolvedAt = null;
      ticket.closedBy = null;
    }

    await ticket.save();
    emitTicketUpdated(req, ticket);

    res.json({ ticket: await loadCompanyTicketView(ticket) });
  } catch (error) {
    console.error("Ticket patch error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const assignTicket = async (req, res) => {
  try {
    const { assigneeId } = req.body;
    const ticket = await Ticket.findOne({
      ticketNumber: req.params.ticketNumber,
      companyId: req.user.companyId,
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const role = getPrimaryRole(req.user);
    const isOwner = ticket.assignedTo && String(ticket.assignedTo) === String(req.user.id);
    const isPrivileged = ["admin", "superadmin"].includes(role);
    if (!isOwner && !isPrivileged) {
      return res
        .status(403)
        .json({ message: "Only the assigned agent or an admin can change assignment." });
    }

    if (!assigneeId) {
      ticket.assignedTo = null;
      ticket.assignee = "Unassigned";
    } else {
      const agentUser = await User.findById(assigneeId).select("name email").lean();
      if (!agentUser) {
        return res.status(404).json({ message: "Agent not found." });
      }
      ticket.assignedTo = assigneeId;
      ticket.assignee = agentUser.name || agentUser.email || "Agent";
    }

    await ticket.save();
    emitTicketUpdated(req, ticket);

    res.json({ ticket: await loadCompanyTicketView(ticket) });
  } catch (error) {
    console.error("Ticket assignment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const SEVERITIES = ["low", "medium", "high", "critical"];

export const getTicketSettings = async (req, res) => {
  try {
    const settings = await getCompanySettings(req.user.companyId);
    res.json({ settings });
  } catch (error) {
    console.error("Get ticket settings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTicketSettings = async (req, res) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ message: "No company associated with this account." });
    }

    const isSuperAdmin = req.user.roles?.includes("superadmin");
    if (!isSuperAdmin && !(await companyHasFeature(req.user.companyId, "customSlaSettings"))) {
      return res.status(403).json({
        message: "Custom SLA targets and support-hours notes require the Enterprise plan.",
        upgradeRequired: "enterprise",
      });
    }

    const { slaTargets, autoAssignOnReply, supportHoursNote } = req.body;
    const update = {};

    if (slaTargets && typeof slaTargets === "object") {
      for (const [sev, raw] of Object.entries(slaTargets)) {
        if (!SEVERITIES.includes(sev)) continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) {
          return res.status(400).json({
            message: `Invalid SLA target for "${sev}" — must be a positive number of minutes.`,
          });
        }
        update[`ticketSettings.slaTargets.${sev}`] = Math.round(value);
      }
    }
    if (autoAssignOnReply !== undefined) {
      update["ticketSettings.autoAssignOnReply"] = Boolean(autoAssignOnReply);
    }
    if (supportHoursNote !== undefined) {
      update["ticketSettings.supportHoursNote"] = String(supportHoursNote).slice(0, 200);
    }

    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      { $set: update },
      { new: true },
    )
      .select("ticketSettings")
      .lean();

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    res.json({ settings: await getCompanySettings(req.user.companyId) });
  } catch (error) {
    console.error("Update ticket settings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 };

export const getTicketReports = async (req, res) => {
  try {
    const isSuperAdmin = req.user.roles?.includes("superadmin");
    if (!isSuperAdmin && !(await companyHasFeature(req.user.companyId, "reports"))) {
      return res.status(403).json({
        message: "Reports require the Professional plan or higher.",
        upgradeRequired: "professional",
      });
    }

    const days = RANGE_DAYS[req.query.range];
    const match = { ...getTicketScope(req) };
    if (days) {
      match.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }

    const tickets = await Ticket.find(match)
      .select("status severity channel assignee createdAt resolvedAt")
      .lean();

    const totals = { total: tickets.length, open: 0, inProgress: 0, escalated: 0, resolved: 0 };
    const byStatusMap = {};
    const bySeverityMap = {};
    const byChannelMap = {};
    const byAgentMap = {};
    const byDayMap = {};
    let resolutionMinutesSum = 0;
    let resolvedCount = 0;

    for (const t of tickets) {
      if (t.status === "open") totals.open++;
      else if (t.status === "in-progress") totals.inProgress++;
      else if (t.status === "escalated") totals.escalated++;
      else if (t.status === "resolved") totals.resolved++;

      byStatusMap[t.status] = (byStatusMap[t.status] || 0) + 1;
      bySeverityMap[t.severity] = (bySeverityMap[t.severity] || 0) + 1;
      byChannelMap[t.channel] = (byChannelMap[t.channel] || 0) + 1;

      const agentLabel = t.assignee && t.assignee !== "Unassigned" ? t.assignee : "Unassigned";
      byAgentMap[agentLabel] = (byAgentMap[agentLabel] || 0) + 1;

      const day = new Date(t.createdAt).toISOString().slice(0, 10);
      byDayMap[day] = (byDayMap[day] || 0) + 1;

      if (t.status === "resolved" && t.resolvedAt) {
        resolutionMinutesSum += (new Date(t.resolvedAt) - new Date(t.createdAt)) / 60000;
        resolvedCount++;
      }
    }

    // SLA breaches: currently-open tickets whose live remaining time has hit 0.
    const { slaTargets } = await getCompanySettings(req.user.companyId);
    const slaBreaches = tickets.filter((t) => {
      if (t.status === "resolved") return false;
      return computeSla(t, slaTargets).slaMins <= 0;
    }).length;

    const volumeByDay = Object.entries(byDayMap)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({ date, count }));

    res.json({
      totals,
      avgResolutionMinutes: resolvedCount ? Math.round(resolutionMinutesSum / resolvedCount) : 0,
      slaBreaches,
      volumeByDay,
      byStatus: Object.entries(byStatusMap).map(([status, count]) => ({ status, count })),
      bySeverity: Object.entries(bySeverityMap).map(([severity, count]) => ({ severity, count })),
      byChannel: Object.entries(byChannelMap).map(([channel, count]) => ({ channel, count })),
      byAgent: Object.entries(byAgentMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([agent, count]) => ({ agent, count })),
    });
  } catch (error) {
    console.error("Ticket reports error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export { AGENT_ROLES };
