import Company from "../models/Company.js";
import User from "../models/User.js";
import Ticket from "../models/Ticket.js";

const PRODUCT_OVERVIEW = `You are the Reslv support assistant. Reslv is a customer-support and engineering
platform: customers file tickets, support agents reply and resolve them, and unresolved or
technical issues can be turned into engineering tasks tracked in a Sprint Planner. As the
assistant, you help a customer with general product questions, how to contact a live agent, and
how to use the support portal (filing a ticket, replying to one, checking a ticket's status).`;

const FORMATTING_INSTRUCTIONS = `You're replying inside a small chat widget, not a document. Keep
replies short. Break distinct points into separate short paragraphs (blank line between them) or a
"- " bullet list instead of one long run-on paragraph, and use **bold** sparingly for key terms.`;

const HANDOFF_INSTRUCTIONS = `Answer only using the context provided below — never invent ticket
details, dates, or account specifics that aren't given to you. If the customer's question needs a
human (account-specific troubleshooting, a billing dispute, anything this context doesn't cover,
or an explicit request to talk to a person), give the best short answer you can and then end your
reply with the exact text [[HANDOFF]] on its own line so the system can connect them to a live agent.`;

// Company-level context (support hours, SLA targets) rarely changes mid
// conversation, so it's cached briefly rather than re-queried on every turn.
const COMPANY_CONTEXT_TTL_MS = 5 * 60 * 1000;
const companyContextCache = new Map();

async function getCompanyContext(companyId) {
  const cached = companyContextCache.get(String(companyId));
  if (cached && Date.now() - cached.at < COMPANY_CONTEXT_TTL_MS) {
    return cached.text;
  }

  const company = await Company.findById(companyId)
    .select("name ticketSettings")
    .lean();

  const text = company
    ? [
        `Company: ${company.name}.`,
        company.ticketSettings?.supportHoursNote
          ? `Support hours: ${company.ticketSettings.supportHoursNote}.`
          : "",
        company.ticketSettings?.slaTargets
          ? `Typical response targets (minutes) by severity — low: ${company.ticketSettings.slaTargets.low}, medium: ${company.ticketSettings.slaTargets.medium}, high: ${company.ticketSettings.slaTargets.high}, critical: ${company.ticketSettings.slaTargets.critical}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  companyContextCache.set(String(companyId), { text, at: Date.now() });
  return text;
}

// Fresh every call (never cached) — a customer's ticket status can change at
// any moment, unlike company-wide settings.
async function getCustomerContext(customerId) {
  if (!customerId) return "";

  const [customer, openCount, resolvedCount, recentTickets] = await Promise.all([
    User.findById(customerId).select("name customerProfile.planTier").lean(),
    Ticket.countDocuments({ createdBy: customerId, status: { $ne: "resolved" } }),
    Ticket.countDocuments({ createdBy: customerId, status: "resolved" }),
    Ticket.find({ createdBy: customerId })
      .select("ticketNumber subject status")
      .sort({ updatedAt: -1 })
      .limit(3)
      .lean(),
  ]);

  if (!customer) return "";

  const lines = [
    `You are talking to ${customer.name || "a customer"}${customer.customerProfile?.planTier ? ` (plan: ${customer.customerProfile.planTier})` : ""}.`,
    `They have ${openCount} open ticket${openCount === 1 ? "" : "s"} and ${resolvedCount} resolved ticket${resolvedCount === 1 ? "" : "s"}.`,
  ];

  if (recentTickets.length > 0) {
    lines.push(
      "Their most recent tickets: " +
        recentTickets
          .map((t) => `${t.ticketNumber} ("${t.subject}", status: ${t.status})`)
          .join("; ") +
        ".",
    );
  }

  return lines.join(" ");
}

export async function buildSystemPrompt(companyId, customerId) {
  const [companyContext, customerContext] = await Promise.all([
    getCompanyContext(companyId),
    getCustomerContext(customerId),
  ]);

  return [PRODUCT_OVERVIEW, FORMATTING_INSTRUCTIONS, companyContext, customerContext, HANDOFF_INSTRUCTIONS]
    .filter(Boolean)
    .join("\n\n");
}
