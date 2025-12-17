// api/ai/intentResolvers.js

export const intentResolvers = {
  trip_summary: trip => trip.trip,

  driver_info: trip => ({
    driver: trip.trip.driver,
    terminals: trip.trip.terminals
  }),

  stops_remaining: trip =>
    trip.stops.filter(s => s.status !== "Complete"),

  current_stop: trip =>
    trip.stops.find(s => s.isCurrent),

  pro_status: (trip, value) =>
    trip.stops
      .flatMap(s => s.tasks)
      .filter(t => t.pro === value),

  pending_deliveries: trip =>
    trip.stops
      .flatMap(s => s.tasks)
      .filter(t => t.taskType === "DO" && t.status !== "Complete")
};
