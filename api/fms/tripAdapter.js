/**
 * tripAdapter.js
 * Normalizes raw FMS Trip payloads into a stable internal format
 * Source system: FMS
 */

export function normalizeTrip(raw) {
  if (!raw || !raw.trip || !raw.trip.data) {
    throw new Error("Invalid FMS trip payload");
  }

  const tripData = raw.trip.data;

  return {
    trip: normalizeTripHeader(tripData),
    stops: normalizeStops(tripData),
    meta: buildMeta(tripData)
  };
}

/* =========================
   Trip Header Normalization
   ========================= */

function normalizeTripHeader(d) {
  return {
    tripNo: d.trip_no || d.tripNo || null,
    tripType: mapTripType(d.trip_type),
    status: d.assign_status_text || null,
    route: {
      id: d.route_id || null,
      name: d.route_name || null
    },
    terminals: {
      origin: d.org_terminal || null,
      destination: d.dst_terminal || null
    },
    driver: {
      code: d.driver_code || null,
      name: d.driver_name || null
    },
    dispatchDate: d.dispatch_date || null,
    completedAt: d.complete_time || null
  };
}

function mapTripType(type) {
  switch (type) {
    case 1: return "Pickup";
    case 2: return "Linehaul";
    case 3: return "Delivery";
    default: return "Unknown";
  }
}

/* =========================
   Stops Normalization
   ========================= */

function normalizeStops(d) {
  const rawStops = d.stop_list || [];

  return rawStops.map((s, index) => ({
    stopId: s.stop_id || null,
    sequence: s.sequence ?? index + 1,
    terminal: s.terminal_code || null,
    type: mapStopType(s.stop_type),
    status: s.stop_status_text || null,
    isCurrent: s.is_current === 1,
    tasks: normalizeTasks(s.task_list || [])
  }));
}

function mapStopType(type) {
  switch (type) {
    case 1: return "Pickup";
    case 2: return "Delivery";
    case 3: return "Linehaul";
    default: return "Unknown";
  }
}

/* =========================
   Tasks Normalization
   ========================= */

function normalizeTasks(tasks) {
  return tasks.map(t => ({
    taskNo: t.task_no || null,
    taskType: mapTaskType(t.task_type),
    do: t.order_no || null,
    pro: t.tracking_pro || null,
    pu: t.pu_no || null,
    status: t.task_status_text || null,
    checkedIn: t.check_in_status === 1,
    completedAt: t.complete_time || null
  }));
}

function mapTaskType(type) {
  switch (type) {
    case 1: return "PU";
    case 2: return "DO";
    case 3: return "LH";
    default: return "Unknown";
  }
}

/* =========================
   Meta / Diagnostics
   ========================= */

function buildMeta(d) {
  return {
    rawTripType: d.trip_type ?? null,
    optimizeStatus: d.optimize_status_text || null,
    source: "FMS"
  };
}
