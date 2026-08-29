// Shared message-body rendering for anywhere a chatbot-authored message can
// show up: the live widget, a ticket thread after handoff, and the agent
// inbox's copy of that same thread. Turns loose "- " lists and **bold**
// into real elements, and stops a trailing emoji from getting orphaned onto
// its own line when the browser wraps mid-sentence.
const LIST_MARKER = /^\s*(?:[-*]|\d+\.)\s+/;

// Replaces the whitespace right before an emoji with a non-breaking space,
// so a line can never wrap between the last word and its emoji.
function glueEmojis(text) {
  return text.replace(/([^\s])\s+(\p{Extended_Pictographic})/gu, "$1 $2");
}

function renderBoldSegments(line, keyPrefix) {
  return glueEmojis(line)
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={`${keyPrefix}-${i}`}>{part}</span>
      ),
    );
}

// Gemini replies come back as loose markdown (paragraphs, "- " lists, blank
// lines between them) which a plain {text} render collapses into one
// run-on line — this turns it back into paragraphs/lists so it reads the
// way it was written.
export function renderMessageText(text) {
  if (!text) return null;
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return null;

  return blocks.map((block, bi) => {
    const lines = block.split("\n").filter((l) => l.trim());
    if (lines.every((l) => LIST_MARKER.test(l))) {
      return (
        <ul key={bi} className="list-disc list-inside space-y-1">
          {lines.map((line, li) => (
            <li key={li}>{renderBoldSegments(line.replace(LIST_MARKER, ""), `${bi}-${li}`)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={bi}>
        {lines.map((line, li) => (
          <span key={li}>
            {renderBoldSegments(line, `${bi}-${li}`)}
            {li < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}
