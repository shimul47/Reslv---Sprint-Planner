// A cheap pre-filter that runs before a customer message ever reaches
// Gemini. Two goals: don't spend an API call on a message that clearly
// isn't a real support question, and never let profanity/abuse turn into
// an actual ticket in the agent inbox — it gets a fixed, passive reply and
// the conversation just continues from there instead of escalating.
//
// Patterns use \b word boundaries and repeated-letter classes (fu+ck+) so
// "assessment" or "grass" don't false-positive, while "fuuuck" or "shittt"
// still match. Kept as a short, easy-to-extend list rather than pulling in
// a moderation library for what's meant to stay a lightweight gate.
const ABUSIVE_PATTERNS = [
  /\bf+u+c+k+(?:ing|ed|er|ers)?\b/i,
  /\bmother\s*f+u+c+k+(?:ing|er|ers)?\b/i,
  /\bs+h+i+t+(?:ty|s)?\b/i,
  /\bb+i+t+c+h+(?:es|y)?\b/i,
  /\ba+s+s+h+o+l+e+s?\b/i,
  /\bc+u+n+t+s?\b/i,
  /\bb+a+s+t+a+r+d+s?\b/i,
  /\bd+i+c+k+h+e+a+d+s?\b/i,
  /\bs+l+u+t+s?\b/i,
  /\bw+h+o+r+e+s?\b/i,
  /\bidiot\b/i,
  /\bstupid\b/i,
];

const PASSIVE_REPLY =
  "Please keep communication respectful so our team can assist you effectively. 🤝";

export function isDisallowedMessage(text) {
  return ABUSIVE_PATTERNS.some((pattern) => pattern.test(text));
}

export function moderationReply() {
  return PASSIVE_REPLY;
}
