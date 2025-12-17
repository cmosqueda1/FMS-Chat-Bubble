// api/chat.js
import { handleChatMessage } from "../server/chatRouter.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { message, step, context } = req.body || {};

  const response = handleChatMessage({
    message,
    step: step || "START",
    context: context || {}
  });

  res.status(200).json(response);
}
