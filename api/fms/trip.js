/**
 * /api/fms/trip.js
 * Vercel Serverless Function
 *
 * GET /api/fms/trip?tripNo=B01PSZ
 *
 * Fetches RAW Trip data only.
 */

import { fmsFetch } from "./utils/fmsFetch";

export default async function handler(req, res) {
  try {
    const { tripNo } = req.query;

    if (!tripNo) {
      return res.status(400).json({
        error: "Missing required query param: tripNo"
      });
    }

    const data = await getTripRaw(tripNo);
    return res.status(200).json(data);

  } catch (err) {
    console.error("Trip API Error:", err);

    return res.status(500).json({
      error: "Trip fetch failed",
      message: err.message || "Unknown error"
    });
  }
}

/* =========================
   RAW Trip Aggregator
========================= */

async function getTripRaw(tripNo) {
  const result = {
    tripNo,
    trip: null,
    stops: null,
    tasks: null,
    statistics: null,
    tracking: null,
    files: null,
    history: null
  };

  // REQUIRED
  result.trip = await getTrip(tripNo);
  result.stops = await getStopList(tripNo);
  result.tasks = await getTaskList(tripNo);

  // OPTIONAL (safe)
  result.statistics = await safe(() => getTripStatistics(tripNo));
  result.tracking = await safe(() => getTripTracking(tripNo));
  result.files = await safe(() => getTripFiles(tripNo));
  result.history = await safe(() => getTripHistory(tripNo));

  return result;
}

/* =========================
   FMS API Calls
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

async function safe(fn) {
  try {
    return await fn();
  } catch (err) {
    console.warn("Optional trip fetch failed:", err.message);
    return null;
  }
}
