// api/chat.js
import chatRouter from "../server/chatRouter.js";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // Always respond JSON
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({
      messages: [{ type: "system", text: "Method not allowed." }],
      context: {}
    });
  }

  try {
    const body = req.body || {};
    const message = typeof body.message === "string" ? body.message : "";
    const context = (body.context && typeof body.context === "object") ? body.context : {};

    // Call deterministic router
    const out = await chatRouter({ message, context });

    // Hard guarantee response shape to avoid silent UI failures
    const safe = {
      messages: Array.isArray(out?.messages) ? out.messages : [{ type: "system", text: "Unexpected response format." }],
      context: (out?.context && typeof out.context === "object") ? out.context : context
    };

    return res.status(200).json(safe);
  } catch (err) {
    console.error("api/chat.js ERROR:", err);

    // Always return a shape the UI can render
    return res.status(200).json({
      messages: [{ type: "system", text: `Server error: ${err?.message || "Unknown error"}` }],
      context: {}
    });
  }
}
