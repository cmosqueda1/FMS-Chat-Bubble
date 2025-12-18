// api/chat.js
import chatRouter from "../server/chatRouter.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, context = {} } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Missing or invalid message"
      });
    }

    const result = await chatRouter({
      message: message.trim(),
      context
    });

    // HARD GUARARD — this prevents silent 500s
    if (!result || !Array.isArray(result.messages)) {
      return res.status(500).json({
        error: "Chat router returned invalid response"
      });
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error("CHAT API ERROR:", err);

    return res.status(500).json({
      error: err.message || "Chat handler failed"
    });
  }
}
