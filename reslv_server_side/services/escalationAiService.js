import { gemini, GEMINI_MODEL } from "../config/gemini.js";

// Only Gemini's "high demand" 503s are worth retrying — they're usually gone
// within a second or two. A 429 is a quota/rate-limit error: on the free
// tier it's most often the per-day cap (e.g. "20 requests/day"), which a
// short backoff can never clear, so retrying it just adds latency before
// hitting the exact same error again. Fail straight to the fallback instead.
const RETRYABLE_STATUSES = new Set([503]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(prompt, { retries = 2, baseDelayMs = 800 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
    } catch (error) {
      const status = error?.status ?? error?.response?.status;
      if (!RETRYABLE_STATUSES.has(status) || attempt >= retries) throw error;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
}

// Pulls the first {...} block out of a model reply — Gemini sometimes wraps
// JSON in a ```json fence despite the prompt asking for raw JSON.
function extractJson(text) {
  const match = text?.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function ticketTranscript(ticket) {
  return (ticket.messages || [])
    .filter((m) => m.from !== "internal")
    .map((m) => `${m.from === "customer" ? "Customer" : "Agent"}: ${m.text}`)
    .join("\n");
}

// Called when an agent escalates an assigned ticket to admin. Drafts a
// short summary of the issue plus which existing team should own it, so the
// admin doesn't have to re-read the whole thread before acting.
export async function summarizeEscalation({ ticket, agentName, segments }) {
  const fallback = {
    summary: `Escalated by ${agentName || "an agent"}: ${ticket.subject}.`,
    suggestedTeamName: "",
    suggestedSegmentId: null,
  };

  try {
    const teamNames = (segments || []).map((s) => s.name);
    const prompt = `A support agent is escalating this ticket to an admin because they couldn't resolve it themselves.

Ticket subject: ${ticket.subject}
Ticket description: ${ticket.description}

Conversation so far:
${ticketTranscript(ticket) || "(no messages yet)"}

Available teams: ${teamNames.length ? teamNames.join(", ") : "(none configured)"}

Reply with ONLY a JSON object, no other text:
{"summary": "2-3 sentences: what the main issue is and why it needs admin attention", "teamName": "the single best-matching team name from the list above, or empty string if none fit"}`;

    const response = await generateWithRetry(prompt);

    const parsed = extractJson(response.text);
    if (!parsed?.summary) return fallback;

    const matchedSegment = (segments || []).find(
      (s) => s.name.toLowerCase() === String(parsed.teamName || "").toLowerCase(),
    );

    return {
      summary: parsed.summary,
      suggestedTeamName: matchedSegment?.name || "",
      suggestedSegmentId: matchedSegment?._id || null,
    };
  } catch (error) {
    console.error("summarizeEscalation error:", error);
    return fallback;
  }
}

// Called when the sprint task linked to an escalated ticket is marked done,
// so the admin can see at a glance what was actually fixed before resolving
// the ticket themselves.
export async function summarizeCompletion({ ticket, task }) {
  const fallback = `The linked sprint task "${task.title}" has been marked done.`;

  try {
    const prompt = `A sprint task created from an escalated support ticket has just been completed. Write a 2-3 sentence summary of the work done, for the admin who will resolve the original ticket.

Original ticket subject: ${ticket.subject}
Task title: ${task.title}
Task description: ${task.description || "(none)"}
Hours logged: ${task.actualHours ?? "unknown"}

Reply with ONLY the summary text, no preamble, no JSON.`;

    const response = await generateWithRetry(prompt);

    return response.text?.trim() || fallback;
  } catch (error) {
    console.error("summarizeCompletion error:", error);
    return fallback;
  }
}
