import User from "../models/User.js";
import Ticket from "../models/Ticket.js";

// Reference ceiling for the log-scaled ARR component — chosen so score
// doesn't need rescaling as the customer base grows, while still giving a
// small starter customer's critical bug a non-zero urgency-driven score.
const ARR_REFERENCE_CENTS = 500000 * 100;
const WEIGHT_ARR = 0.5;
const WEIGHT_CHURN = 0.3;
const WEIGHT_URGENCY = 0.2;
const URGENCY_SCORES = { low: 25, medium: 50, high: 75, critical: 100 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Pure scoring function — no DB access, so it's easy to unit-test and reuse
// wherever a score needs recomputing (ticket create/severity-change, a
// customer's contract-value update, a task's ticket link).
export function computeImpactScore({ contractValueCents = 0, churnRiskScore = 0, severityOrPriority = "medium" }) {
  const arrScore = clamp(
    (Math.log10(contractValueCents / 100 + 1) / Math.log10(ARR_REFERENCE_CENTS / 100)) * 100,
    0,
    100,
  );
  const churnScore = clamp(Number(churnRiskScore) || 0, 0, 100);
  const urgencyScore = URGENCY_SCORES[severityOrPriority] ?? URGENCY_SCORES.medium;
  const score = Math.round(WEIGHT_ARR * arrScore + WEIGHT_CHURN * churnScore + WEIGHT_URGENCY * urgencyScore);

  return {
    score,
    breakdown: {
      arrScore: Math.round(arrScore),
      churnScore: Math.round(churnScore),
      urgencyScore,
    },
  };
}

// Mutates (does not save) ticket.businessImpactScore/Breakdown from the
// creating customer's live contract data. Callers save the ticket.
export async function recomputeTicketImpact(ticket) {
  const customer = await User.findById(ticket.createdBy).select("customerProfile").lean();
  const profile = customer?.customerProfile || {};
  const { score, breakdown } = computeImpactScore({
    contractValueCents: profile.contractValueCents || 0,
    churnRiskScore: profile.churnRiskScore ?? 20,
    severityOrPriority: ticket.severity,
  });
  ticket.businessImpactScore = score;
  ticket.businessImpactBreakdown = breakdown;
  return ticket;
}

// Scoring flows ticket -> task only: an unlinked task always scores 0, and a
// linked task simply inherits its ticket's already-computed score, so a task
// never independently outranks the ticket it serves. Callers save the task.
export async function recomputeTaskImpact(task) {
  if (!task.ticketId) {
    task.businessImpactScore = 0;
    task.businessImpactBreakdown = null;
    return task;
  }
  const ticket = await Ticket.findById(task.ticketId)
    .select("businessImpactScore businessImpactBreakdown")
    .lean();
  task.businessImpactScore = ticket?.businessImpactScore || 0;
  task.businessImpactBreakdown = ticket?.businessImpactBreakdown || null;
  return task;
}
