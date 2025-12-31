/**
 * FMS/API/message.js
 */

import { handleMessage } from "../../AI/index.js";

export default async function handler(req, res) {
  try {
    const { scope, question } = req.body;

    const reply = await handleMessage({ scope, question });

    res.json({
      reply: reply || "No response generated."
    });
  } catch (err) {
    console.error("AI MESSAGE ERROR:", err);
    res.status(500).json({
      reply: "An error occurred while generating the response."
    });
  }
}