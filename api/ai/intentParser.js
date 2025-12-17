// api/ai/intentParser.js

/**
 * Converts user chat input into a structured intent object.
 * This is the ONLY place AI interprets user language.
 */

export async function parseIntent(userMessage, llm) {
  const prompt = `
You are an intent classifier for a logistics system.

Extract ONE intent from the user message.
Return ONLY valid JSON.
Do NOT explain anything.

Supported intents:
- trip_summary
- driver_info
- trip_status
- route_info
- stops_remaining
- current_stop
- completed_stops
- pro_status
- do_status
- pu_status
- pending_deliveries
- pending_pickups

If a shipment identifier is present, extract:
- type: PRO | DO | PU
- value: string

JSON format:
{
  "intent": "<intent_key>",
  "tripNo": "<trip number if present>",
  "identifier": { "type": "<PRO|DO|PU>", "value": "<id>" } | null
}

User message:
"${userMessage}"
`;

  const response = await llm(prompt);

  try {
    return JSON.parse(response);
  } catch {
    throw new Error("Intent parsing failed");
  }
}
