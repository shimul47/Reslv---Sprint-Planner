import Company from "../models/Company.js";
import User from "../models/User.js";
import Ticket from "../models/Ticket.js";

const PRODUCT_OVERVIEW = `You are the Reslv support assistant. Reslv is a customer-support and engineering
platform: customers file tickets, support agents reply and resolve them, and unresolved or
technical issues can be turned into engineering tasks tracked in a Sprint Planner. As the
assistant, you help a customer with general product questions, how to contact a live agent, and
how to use the support portal (filing a ticket, replying to one, checking a ticket's status).

What a customer can actually do in the portal — don't describe capabilities beyond this list:
- Sign up or log in with email + password.
- File a new ticket with a subject and description.
- Reply to their own ticket to add details or follow up.
- See each ticket's status and reply history in real time.
- Once a ticket is marked resolved, leave a 1-5 star rating and an optional comment.
- Talk to you (this chatbot) any time, and ask to be connected to a live agent.

Ticket status lifecycle, in order: open (just filed, not yet picked up) -> in-progress (an agent is
working it) -> escalated (raised for more urgent/specialist attention) -> resolved (closed; feedback
can be left). There is no "reopen" self-service action — a resolved ticket that still needs work
should get a fresh reply from the customer or a new ticket, at your judgment based on what they say.

You cannot see or change a customer's account settings, billing, or password from here — for those,
say so plainly and offer to connect them with a live agent rather than guessing at a self-service
flow that doesn't exist.`;

const FORMATTING_INSTRUCTIONS = `You're replying inside a small chat widget, not a document. Reply
using ONLY a "- " bullet list — no greeting, no preamble, no "sure, here's..." framing, no closing
remarks, just the bullet points. Keep each bullet short and to the point, and use **bold** sparingly
for key terms. You may add one relevant emoji at the very END of a bullet if it genuinely helps the
point land faster or makes the reply easier to scan — never at the start, never purely as decoration,
and never more than one per bullet.

When a bullet is walking the customer through steps (navigating the UI, a sequence of actions), write
it as a short arrow chain of 2-4 word stops instead of a full sentence — e.g. "Sign in -> Tickets ->
New Ticket" rather than "First sign in, then go to the Tickets tab and click New Ticket." Only use
this arrow-chain form for step-by-step navigation, not for general explanations.`;

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

  // The model has no built-in sense of "today" — worth stating plainly since
  // customers ask about SLA timing, "since when", etc. relative to now.
  const dateContext = `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

  return [PRODUCT_OVERVIEW, FORMATTING_INSTRUCTIONS, dateContext, companyContext, customerContext, HANDOFF_INSTRUCTIONS]
    .filter(Boolean)
    .join("\n\n");
}
