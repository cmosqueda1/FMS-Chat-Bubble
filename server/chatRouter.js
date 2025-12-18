import { ensureFmsSession } from "./fmsSession.js";
import { fmsSearch } from "./fmsSearch.js";

export async function routeChat({ action, text }) {
  // Ensure login happens once
  await ensureFmsSession();

  if (action === "init") {
    return {
      messages: [
        {
          type: "assistant",
          text: "Connected to FMS. You can search by Trip, DO, or PRO."
        }
      ],
      context: {}
    };
  }

  if (!text || !text.trim()) {
    return {
      messages: [
        {
          type: "system",
          text: "Please enter a Trip, DO, or PRO number."
        }
      ],
      context: {}
    };
  }

  const keyword = text.trim().toUpperCase();
  const results = await fmsSearch(keyword);

  return {
    messages: [
      {
        type: "assistant",
        text: `Found ${results?.length || 0} result(s) for ${keyword}.`
      }
    ],
    context: { results }
  };
}
