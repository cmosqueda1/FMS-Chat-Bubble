import { fmsFetch } from "../utils/fmsFetch";

/**
 * Vercel API Route
 * GET /api/fms/trip?tripNo=B01PSZ
 */
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
   Raw Trip Data Collector
========================= */

async function getTripRaw(tripNo) {
  const results = {
    tripNo,
    trip: null,
    stops: null,
    tasks: null,
    statistics: null,
    tracking: null,
    files: null,
    history: null
  };

  results.trip = await getTrip(tripNo);
  results.stops = await getStopList(tripNo);
  results.tasks = await getTaskList(tripNo);

  results.statistics = await safe(() => getTripStatistics(tripNo));
  results.tracking = await safe(() => getTripTracking(tripNo));
  results.files = await safe(() => getTripFiles(tripNo));
  results.history = await safe(() => getTripHistory(tripNo));

  return results;
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
  } catch (e) {
    return null;
  }
}
