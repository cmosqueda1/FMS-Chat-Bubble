import { handleChatMessage } from "../server/chatRouter.js";

// 🔴 FORCE NODE RUNTIME (NOT EDGE)
export const config = {
  runtime: "nodejs"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message, context } = req.body || {};

    const response = await handleChatMessage({
      message,
      context
    });

    return res.status(200).json(response);
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({
      error: err.message || "Internal Server Error"
    });
  }
}
