import { runSearch } from "../api/fms/search.js";
import { resolveSearchResult } from "../api/fms/resolveSearch.js";

/* helpers */
function extractIdentifier(text = "") {
  const t = text.toUpperCase();
  return (
    t.match(/B[A-Z0-9]+/)?.[0] ||
    t.match(/DO\d+/)?.[0] ||
    t.match(/\b(\d{6,8}|\d{11})\b/)?.[0] ||
    null
  );
}

function isQuestion(text = "") {
  return /WHAT|HOW|WHEN|WHERE|WHY|STATUS|DELIVER|STOP|\?/i.test(text);
}

function summarize(resolved) {
  if (resolved.type === "TRIP") {
    return `Trip ${resolved.tripNo} found.`;
  }

  if (resolved.type === "PRO") {
    return resolved.do
      ? `Order ${resolved.do} found (PRO ${resolved.pro}).`
      : `PRO ${resolved.pro} found.`;
  }

  return `Multiple or unclear results found for ${resolved.keyword}.`;
}

/*
  Main deterministic router
*/
export async function handleChatMessage({ message, context = {} }) {
  const text = (message || "").trim();
  const identifier = extractIdentifier(text);
  const question = isQuestion(text);

  // Lookup (identifier present)
  if (identifier) {
    const searchResult = await runSearch(identifier);
    const resolved = resolveSearchResult(searchResult);

    context.lastLookup = resolved;

    return {
      nextStep: "AWAITING_INPUT",
      messages: [{ type: "system", text: summarize(resolved) }],
      contextUpdates: { lastLookup: resolved }
    };
  }

  // Question using previous context
  if (question && context.lastLookup) {
    return {
      nextStep: "AWAITING_INPUT",
      messages: [
        {
          type: "system",
          text: `Answering question about ${context.lastLookup.type}.`
        },
        { type: "system", text: "(Generic placeholder response)" }
      ],
      contextUpdates: {}
    };
  }

  // Generic fallback
  return {
    nextStep: "AWAITING_INPUT",
    messages: [
      {
        type: "system",
        text: "Enter a Trip, DO, or PRO number, or ask a question."
      }
    ],
    contextUpdates: {}
  };
}
