import { getLLMSession } from "./ai/llm.js";
import { parseIntent } from "./intentParser.js";
import { intentResolvers } from "./intentResolvers.js";
import { fetchTrip } from "./trip.js";

/**
 * POST /api/chat
 * Body: { message: string }
 */
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Missing or invalid message" });
      return;
    }

    // 1) Parse intent from user message
    const intent = parseIntent(message);
    // intent example: { type: "trip_summary", value: "B01PSZ" }

    // 2) Fetch trip data only if intent needs it
    let tripData = null;
    if (intent?.value) {
      tripData = await fetchTrip(intent.value);
    }

    // 3) Resolve structured data for this intent
    let resolvedData = null;
    if (intent?.type && intentResolvers[intent.type]) {
      resolvedData = intentResolvers[intent.type](tripData, intent.value);
    }

    // 4) If we can answer deterministically, do it without LLM
    if (resolvedData && typeof resolvedData === "string") {
      res.json({ reply: resolvedData });
      return;
    }

    // 5) Otherwise, use LLM to summarize cleanly
    const llm = await getLLMSession();

    const systemPrompt = `
You are a logistics assistant.
Respond in a concise, clear, chat-bubble-friendly way.
Do not repeat raw JSON.
Do not speculate.
If data is missing, say so briefly.
`;

    const userPrompt = `
User question:
${message}

Resolved data (if any):
${resolvedData ? JSON.stringify(resolvedData, null, 2) : "None"}

Answer:
`;

    const reply = await llm.prompt(
      `${systemPrompt}\n${userPrompt}`,
      {
        temperature: 0.2,
        maxTokens: 300
      }
    );

    res.json({ reply: reply.trim() });
  } catch (err) {
    console.error("chat error:", err);
    res.status(500).json({
      error: "Internal error",
      detail: err.message
    });
  }
}
