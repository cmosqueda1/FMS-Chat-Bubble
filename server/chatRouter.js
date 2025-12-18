// server/chatRouter.js
// Deterministic conversational router (NO AI)

function extractIdentifier(message) {
  const text = message.toUpperCase();

  if (/^B[A-Z0-9]+$/.test(text)) return { type: "TRIP", id: text };
  if (/^DO\d+$/.test(text)) return { type: "DO", id: text };
  if (/^\d{6,8}$|^\d{11}$/.test(text)) return { type: "PRO", id: text };

  const tripMatch = text.match(/B[A-Z0-9]+/);
  if (tripMatch) return { type: "TRIP", id: tripMatch[0] };

  const doMatch = text.match(/DO\d+/);
  if (doMatch) return { type: "DO", id: doMatch[0] };

  const proMatch = text.match(/\b(\d{6,8}|\d{11})\b/);
  if (proMatch) return { type: "PRO", id: proMatch[0] };

  return null;
}

function isQuestion(message) {
  return /[?]|WHAT|HOW|WHEN|WHERE|WHY|STATUS|DELIVER|STOP/i.test(message);
}

export function handleChatMessage({ message, step, context }) {
  const text = (message || "").trim();
  const identifier = extractIdentifier(text);
  const question = isQuestion(text);

  /* =========================
     LOOKUP ONLY
  ========================== */
  if (identifier && !question) {
    context.lastLookup = {
      type: identifier.type,
      id: identifier.id,
      data: {} // real data later
    };

    return {
      nextStep: "AWAITING_INPUT",
      messages: [
        {
          type: "system",
          text: `${identifier.type} ${identifier.id} found. (General info returned)`
        }
      ],
      contextUpdates: { lastLookup: context.lastLookup }
    };
  }

  /* =========================
     QUESTION WITH IDENTIFIER
  ========================== */
  if (identifier && question) {
    context.lastLookup = {
      type: identifier.type,
      id: identifier.id,
      data: {}
    };

    return {
      nextStep: "AWAITING_INPUT",
      messages: [
        {
          type: "system",
          text: `Answering question about ${identifier.type} ${identifier.id}.`
        },
        {
          type: "system",
          text: `(Generic response — detailed logic will be added later)`
        }
      ],
      contextUpdates: { lastLookup: context.lastLookup }
    };
  }

  /* =========================
     QUESTION USING CONTEXT
  ========================== */
  if (question && context.lastLookup) {
    return {
      nextStep: "AWAITING_INPUT",
      messages: [
        {
          type: "system",
          text: `Answering question about ${context.lastLookup.type} ${context.lastLookup.id}.`
        },
        {
          type: "system",
          text: `(Generic response — detailed logic will be added later)`
        }
      ],
      contextUpdates: {}
    };
  }

  /* =========================
     GENERIC QUESTION
  ========================== */
  if (question) {
    return {
      nextStep: "AWAITING_INPUT",
      messages: [
        {
          type: "system",
          text: `This looks like a general question.`
        },
        {
          type: "system",
          text: `(Generic response placeholder — SOP / help logic coming later)`
        }
      ],
      contextUpdates: {}
    };
  }

  /* =========================
     FALLBACK
  ========================== */
  return {
    nextStep: "AWAITING_INPUT",
    messages: [
      {
        type: "system",
        text: "Please enter a Trip, DO, or PRO number, or ask a question."
      }
    ],
    contextUpdates: {}
  };
}
