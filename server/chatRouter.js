import { runSearch } from "../api/fms/search.js";
import { resolveSearchResult } from "../api/fms/utils/resolveSearch.js";

/*
  Utility helpers
*/
function extractIdentifier(text) {
  if (!text) return null;

  const t = text.toUpperCase();

  const trip = t.match(/B[A-Z0-9]+/);
  if (trip) return trip[0];

  const doMatch = t.match(/DO\d+/);
  if (doMatch) return doMatch[0];

  const pro = t.match(/\b(\d{6,8}|\d{11})\b/);
  if (pro) return pro[0];

  return null;
}

function isQuestion(text) {
  return /WHAT|HOW|WHEN|WHERE|WHY|STATUS|DELIVER|STOP|\?/i.test(text);
}

/*
  Main router
*/
export async function handleChatMessage({ message, context = {} }) {
  const text = (message || "").trim();
  const identifier = extractIdentifier(text);
  const question = isQuestion(text);

  /*
    LOOKUP (identifier only)
  */
  if (identifier && !question) {
    const searchResult = await runSearch(identifier);
    const resolved = resolveSearchResult(searchResult);

    context.lastLookup = resolved;

    return {
      nextStep: "AWAITING_INPUT",
      messages: [
        { type: "system", text: summarize(resolved) }
      ],
      contextUpdates: { lastLookup: resolved }
    };
  }

  /*
    QUESTION + IDENTIFIER
  */
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
          text: "(Question detected — detailed logic will be added later)"
        }
      ],
      contextUpdates: { lastLookup: resolved }
    };
  }

  /*
    QUESTION using last context
  */
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

  /*
    GENERIC QUESTION (no identifier, no context)
  */
  if (question) {
    return {
      nextStep: "AWAITING_INPUT",
      messages: [
        {
          type: "system",
          text: "This looks like a general question."
        },
        {
          type: "system",
          text: "(Generic placeholder — SOP logic coming later)"
        }
      ],
      contextUpdates: {}
    };
  }

  /*
    FALLBACK
  */
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

/*
  Deterministic summarization
*/
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
