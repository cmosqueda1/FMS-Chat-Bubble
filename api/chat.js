import { routeChat } from "../server/chatRouter.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body || {};
    const action = body.action || "message";

    const result = await routeChat({
      action,
      text: body.text || ""
    });

    res.status(200).json(result);
  } catch (err) {
    console.error("CHAT API ERROR:", err);

    res.status(500).json({
      messages: [
        {
          type: "system",
          text: err.message || "Server error"
        }
      ],
      context: {}
    });
  }
}
