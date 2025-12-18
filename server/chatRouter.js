import { runSearch } from "./fms/search.js";
import { resolveSearchResult } from "./fms/resolveSearch.js";

/* helpers */
function extractIdentifier(text = "") {
  const t = text.toUpperCase();

  const trip = t.match(/B[A-Z0-9]+/);
  if (trip) return trip[0];

  const doMatch = t.match(/DO\d+/);
  if (doMatch) return doMatch[0];

  const pro = t.match(/\b(\d{6,8}|\d{11})\b/);
  if (pro) return pro[0];

  return null;
}

function isQuestion(text = "") {
  return /WHAT|HOW|WHEN|WHERE|WHY|STATUS|DELIVER|STOP|\?/i.test(text);
}

function summarize(resolved) {
  switch (resolved.type) {
    case "TRIP":
      return `Trip ${resolved.tripNo} found.`;

    case "PRO":
      return resolved.do
        ? `Order ${resolved.do} found (PRO ${resolved.pro}).`
        : `PRO ${resolved.pro} found.`;

    case "UNKNOWN":
      return `Multiple or unclear results found for ${resolved.keyword}.`;

    default:
      return "Result found.";
  }
}

/* main router */
export async function handleChatMessage({ message, context = {} }) {
  const text = (message || "").trim();
  const identifier = extractIdentifier(text);
  const question = isQuestion(text);

  // Lookup only
  if (identifier && !question) {
    const searchResult = await runSearch(identifier);
    const resolved = resolveSearchResult(searchResult);

    context.lastLookup = resolved;

    return {
      nextStep: "AWAITING_INPUT",
      messages: [{ type: "system", text: summarize(resolved) }],
      contextUpdates: { lastLookup: resolved }
    };
  }

  // Question + identifier
  if (identifier && question) {
    const searchResult = await runSearch(identifier);
    const resolved = resolveSearchResult(searchResult);

    context.lastLookup = resolved;

    return {
      nextStep: "AWAITING_INPUT",
      messages: [
        { type: "system", text: summarize(resolved) },
        {
          type: "system",
          text: "(Question detected — detailed logic coming next)"
        }
      ],
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
        {
          type: "system",
          text: "(Generic placeholder response)"
        }
      ],
      contextUpdates: {}
    };
  }

  // Generic question
  if (question) {
    return {
      nextStep: "AWAITING_INPUT",
      messages: [
        { type: "system", text: "This looks like a general question." },
        {
          type: "system",
          text: "(Generic placeholder — SOP logic coming later)"
        }
      ],
      contextUpdates: {}
    };
  }

  // Fallback
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
