// server/chatRouter.js
// Deterministic, state-driven router (NO AI)

export function handleChatMessage({ message, step, context }) {
  switch (step) {

    /* =========================
       SESSION START
    ========================== */
    case "START":
      return {
        nextStep: "AWAITING_IDENTIFIER",
        messages: [
          { type: "system", text: "Enter a Trip, DO, or PRO number to begin." }
        ],
        contextUpdates: {}
      };

    /* =========================
       IDENTIFIER ROUTING
    ========================== */
    case "AWAITING_IDENTIFIER": {
      if (!message) {
        return {
          nextStep: "AWAITING_IDENTIFIER",
          messages: [
            { type: "system", text: "Enter a Trip, DO, or PRO number." }
          ],
          contextUpdates: {}
        };
      }

      const input = message.trim().toUpperCase();

      // Trip number (e.g. B01PSZ)
      if (/^B[A-Z0-9]+$/.test(input)) {
        return {
          nextStep: "FETCH_TRIP_DETAILS",
          messages: [
            { type: "system", text: `Fetching Trip ${input}...` }
          ],
          contextUpdates: {
            searchType: "TRIP",
            tripNo: input
          }
        };
      }

      // DO number (e.g. DO251200002358)
      if (/^DO\d+$/.test(input)) {
        return {
          nextStep: "FETCH_DO_DETAILS",
          messages: [
            { type: "system", text: `Fetching Order ${input}...` }
          ],
          contextUpdates: {
            searchType: "DO",
            doNo: input
          }
        };
      }

      // PRO number (6–8 digits OR exactly 11 digits)
      if (/^\d{6,8}$|^\d{11}$/.test(input)) {
        return {
          nextStep: "FETCH_PRO_DETAILS",
          messages: [
            { type: "system", text: `Fetching PRO ${input}...` }
          ],
          contextUpdates: {
            searchType: "PRO",
            proNo: input
          }
        };
      }

      return {
        nextStep: "AWAITING_IDENTIFIER",
        messages: [
          { type: "system", text: "Unrecognized format. Enter a Trip, DO, or PRO number." }
        ],
        contextUpdates: {}
      };
    }

    /* =========================
       PLACEHOLDER FETCH STEPS
       (API wiring comes next)
    ========================== */

    case "FETCH_TRIP_DETAILS":
      return {
        nextStep: "RESULT_READY",
        messages: [
          { type: "system", text: "Trip found. (Mock response)" }
        ],
        contextUpdates: {
          result: { type: "TRIP", mock: true }
        }
      };

    case "FETCH_DO_DETAILS":
      return {
        nextStep: "RESULT_READY",
        messages: [
          { type: "system", text: "Order found. (Mock response)" }
        ],
        contextUpdates: {
          result: { type: "DO", mock: true }
        }
      };

    case "FETCH_PRO_DETAILS":
      return {
        nextStep: "RESULT_READY",
        messages: [
          { type: "system", text: "PRO found. (Mock response)" }
        ],
        contextUpdates: {
          result: { type: "PRO", mock: true }
        }
      };

    /* =========================
       RESULT DISPLAY
    ========================== */
    case "RESULT_READY":
      return {
        nextStep: "AWAITING_IDENTIFIER",
        messages: [
          { type: "system", text: "You may search another Trip, DO, or PRO." }
        ],
        contextUpdates: {}
      };

    /* =========================
       FALLBACK
    ========================== */
    default:
      return {
        nextStep: "START",
        messages: [
          { type: "system", text: "Session reset." }
        ],
        contextUpdates: {}
      };
  }
}
