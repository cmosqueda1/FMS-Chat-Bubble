export function handleChatMessage({ message, step, context }) {
  switch (step) {

    case "START":
      return {
        nextStep: "AWAITING_TRIP_NO",
        messages: [
          { type: "system", text: "Enter a Trip Number to begin." }
        ]
      };

    case "AWAITING_TRIP_NO":
      if (!message || message.length < 4) {
        return {
          nextStep: step,
          messages: [
            { type: "system", text: "Invalid Trip Number. Try again." }
          ]
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
