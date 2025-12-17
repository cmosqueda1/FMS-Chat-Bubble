// api/ai/chatFormatter.js

/**
 * Formats reduced data into a short, chat-bubble-friendly response.
 * No assumptions. No emojis. Concise.
 */

export async function formatChatResponse(intent, data, llm) {
  const rules = `
You are a logistics assistant.
Respond clearly and concisely.
Max 6 lines.
Use bullets only if helpful.
Do not show JSON or field names.
Do not add information that is not present.
`;

  const prompt = `
${rules}

Intent:
${intent}

Data:
${JSON.stringify(data)}

Provide the response as plain text only.
`;

  const response = await llm(prompt);
  return response.trim();
}
