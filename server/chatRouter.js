// server/chatRouter.js
import { runSearch } from "../api/fms/search.js";
import { resolveSearchResult } from "../api/fms/resolveSearch.js";

function trimStr(v) {
  return (typeof v === "string" ? v.trim() : "");
}

function extractIdentifier(text = "") {
  const t = text.toUpperCase();

  // Trip numbers like B01PE6
  const trip = t.match(/\bB[A-Z0-9]{4,}\b/);
  if (trip) return trip[0];

  // DO numbers like DO251200003484
  const doMatch = t.match(/\bDO\d+\b/);
  if (doMatch) return doMatch[0];

  // PRO (6–8 digits) or (11 digits)
  const pro = t.match(/\b(\d{6,8}|\d{11})\b/);
  if (pro) return pro[0];

  return null;
}

function isQuestion(text = "") {
  return /\?|(^|\s)(WHAT|HOW|WHEN|WHERE|WHY|STATUS|DELIVER|DELIVERY|PICKUP|STOP|STOPS|TASK|TASKS|COUNT)\b/i.test(text);
}

function startupMessage() {
  return {
    type: "system",
    text: "Enter a Trip, DO, or PRO number, or ask a question."
  };
}

function summarizeResolved(resolved) {
  if (!resolved || !resolved.type) return "No result.";

  if (resolved.type === "TRIP") {
    return `Trip ${resolved.tripNo} found.`;
  }

  if (resolved.type === "PRO") {
    if (resolved.do) return `Order ${resolved.do} found (PRO ${resolved.pro}).`;
    return `PRO ${resolved.pro} found.`;
  }

  if (resolved.type === "UNKNOWN") {
    return `No single match found. (orders: ${resolved.counts?.orders ?? 0}, trips: ${resolved.counts?.trips ?? 0}, linehaul: ${resolved.counts?.linehaulTasks ?? 0})`;
  }

  return "Result found.";
}

/*
  Deterministic router.
  Must ALWAYS return: { messages: [...], context: {...} }
*/
export default async function chatRouter({ message, context }) {
  const ctx = (context && typeof context === "object") ? { ...context } : {};
  const text = trimStr(message);

  // If UI sends an empty message (or first load triggers a blank send), return startup message
  if (!text) {
    // ensure startup only shows once if you want:
    // show it if we have not shown it yet
    if (!ctx._started) {
      ctx._started = true;
      return { messages: [startupMessage()], context: ctx };
    }
    return { messages: [], context: ctx };
  }

  // Always ensure the startup prompt has been set once.
  if (!ctx._started) ctx._started = true;

  const identifier = extractIdentifier(text);
  const question = isQuestion(text);

  // 1) If the user provided an identifier (Trip/DO/PRO/etc), we always treat it as a lookup request
  //    regardless of whether it is phrased as a question.
  if (identifier) {
    const searchResult = await runSearch(identifier);
    const resolved = resolveSearchResult(searchResult);

    // Save last resolved entity for follow-ups
    ctx.lastLookup = resolved;

    // Deterministic, minimal response for now
    const msg = summarizeResolved(resolved);

    // If the user asked a question too, include a placeholder line (per your requirement)
    if (question) {
      return {
        messages: [
          { type: "system", text: msg },
          { type: "system", text: "(Question detected — detailed question logic will be added next.)" }
        ],
        context: ctx
      };
    }

    return {
      messages: [{ type: "system", text: msg }],
      context: ctx
    };
  }

  // 2) Question without an identifier:
  //    - If we have context, treat it as a follow-up to last lookup
  //    - Otherwise generic placeholder (until SOP logic added)
  if (question) {
    if (ctx.lastLookup) {
      return {
        messages: [
          { type: "system", text: `Follow-up question detected for ${ctx.lastLookup.type}.` },
          { type: "system", text: "(Generic placeholder response — question intent logic coming next.)" }
        ],
        context: ctx
      };
    }

    return {
      messages: [
        { type: "system", text: "(Generic placeholder response — provide a Trip/DO/PRO to retrieve details.)" }
      ],
      context: ctx
    };
  }

  // 3) Non-question, no identifier: treat as generic text for now
  return {
    messages: [
      { type: "system", text: "Please enter a Trip, DO, or PRO number, or ask a question." }
    ],
    context: ctx
  };
}
