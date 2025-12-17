/**
 * /api/fms/trip.js
 *
 * PURPOSE:
 * - Fetch ALL Trip-related data once a Trip # is known
 * - Preserve RAW API responses
 * - No normalization
 * - No UI shaping
 * - No order enrichment
 *
 * Cleanup / formatting will occur in a later file
 */

import { fmsFetch } from "../utils/fmsFetch";

/* =========================
   Public Entry Point
========================= */

export async function getTripRaw(tripNo) {
  if (!tripNo) {
    throw new Error("Trip number is required");
  }

  const results = {
    tripNo,

    // Each key mirrors an FMS endpoint exactly
    trip: null,
    stops: null,
    tasks: null,
    statistics: null,
    tracking: null,
    files: null,
    history: null
  };

  // Core trip data (required)
  results.trip = await getTrip(tripNo);
  results.stops = await getStopList(tripNo);
  results.tasks = await getTaskList(tripNo);

  // Optional / supporting data (safe to fail)
  results.statistics = await safe(() => getTripStatistics(tripNo));
  results.tracking = await safe(() => getTripTracking(tripNo));
  results.files = await safe(() => getTripFiles(tripNo));
  results.history = await safe(() => getTripHistory(tripNo));

  return results;
}

/* =========================
   API Calls (RAW)
========================= */

function getTrip(tripNo) {
  return fmsFetch(
    `/fms-platform-dispatch-management/TripDetail/GetTrip?tripNo=${tripNo}`
  );
}

function getStopList(tripNo) {
  return fmsFetch(
    `/fms-platform-dispatch-management/TripDetail/GetStopList?tripNo=${tripNo}`
  );
}

function getTaskList(tripNo) {
  return fmsFetch(
    `/fms-platform-dispatch-management/TripDetail/GetTaskList?tripNo=${tripNo}`
  );
}

function getTripStatistics(tripNo) {
  return fmsFetch(
    `/fms-platform-dispatch-management/TripDetail/GetTripStatistics?tripNo=${tripNo}`
  );
}

function getTripTracking(tripNo) {
  return fmsFetch(
    `/fms-platform-dispatch-management/Trips/GetAllTrackingByTripId`,
    {
      method: "POST",
      body: JSON.stringify({ trip_no: tripNo })
    }
  );
}

function getTripFiles(tripNo) {
  return fmsFetch(
    `/fms-platform-dispatch-management/Trips/GetFileInfoByTripId`,
    {
      method: "POST",
      body: JSON.stringify({ trip_no: tripNo })
    }
  );
}

function getTripHistory(tripNo) {
  return fmsFetch(
    `/fms-platform-dispatch-management/Trips/GetTripHistory?tripNo=${tripNo}`
  );
}

/* =========================
   Helpers
========================= */

/**
 * Wrap optional calls so one failure
 * does NOT break the entire trip pull
 */
async function safe(fn) {
  try {
    return await fn();
  } catch (err) {
    return null;
  }
}
