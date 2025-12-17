// api/ai/chat.js

import { parseIntent } from "./intentParser.js";
import { intentResolvers } from "./intentResolvers.js";
import { formatChatResponse } from "./chatFormatter.js";
import { fetchAndNormalizeTrip } from "../fms/tripService.js";

/**
 * POST /api/ai/chat
 * Body: { message: string }
 * Headers: x-fms-token, x-auth-token
 */

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 1) Parse intent
    const intentObj = await parseIntent(message, callLLM);
    const { intent, tripNo, identifier } = intentObj;

    if (!intent || !tripNo) {
      return res.status(400).json({
        error: "Unable to determine intent or trip number"
      });
    }

    // 2) Fetch normalized trip
    const tokenCtx = {
      fmsToken: req.headers["x-fms-token"],
      authToken: req.headers["x-auth-token"]
    };

    const trip = await fetchAndNormalizeTrip(tripNo, tokenCtx);

    // 3) Reduce data based on intent
    const resolver = intentResolvers[intent];
    if (!resolver) {
      return res.status(400).json({ error: "Unsupported intent" });
    }

    const slice = resolver(trip, identifier?.value);

    // 4) Format chat response
    const responseText = await formatChatResponse(intent, slice, callLLM);

    return res.status(200).json({ message: responseText });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "AI chat processing failed"
    });
  }
}

/**
 * LLM wrapper
 * Replace implementation with your actual LLM call
 */
async function callLLM(prompt) {
  // Example placeholder:
  // return await openai.responses.create(...)
  throw new Error("LLM call not implemented");
}
