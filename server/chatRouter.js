export function handleChatMessage({ message, step, context }) {
  switch (step) {

    case "START":
      return {
        nextStep: "AWAITING_TRIP_NO",
        messages: [
          { type: "system", text: "Enter a Trip Number to begin." }
        ],
        contextUpdates: {}
      };

    case "AWAITING_TRIP_NO":
      if (!message || message.length < 4) {
        return {
          nextStep: "AWAITING_TRIP_NO",
          messages: [
            { type: "system", text: "Invalid Trip Number. Please try again." }
          ],
          contextUpdates: {}
        };
      }

      return {
        nextStep: "FETCH_TRIP_DETAILS",
        messages: [
          { type: "system", text: `Fetching Trip ${message}...` }
        ],
        contextUpdates: {
          tripNo: message
        }
      };

    case "FETCH_TRIP_DETAILS":
      // Placeholder until FMS API is wired
      return {
        nextStep: "DISPLAY_TASKS",
        messages: [
          { type: "system", text: "Trip found. Displaying tasks." }
        ],
        contextUpdates: {
          tripData: { mock: true }
        }
      };

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
