export const config = {
  runtime: "nodejs"
};

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
      message: err?.message || "Unknown error"
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

  result.trip = await getTrip(tripNo);
  result.stops = await getStopList(tripNo);
  result.tasks = await getTaskList(tripNo);

  result.statistics = await safe(() => getTripStatistics(tripNo));
  result.tracking = await safe(() => getTripTracking(tripNo));
  result.files = await safe(() => getTripFiles(tripNo));
  result.history = await safe(() => getTripHistory(tripNo));

  return result;
}

/* =========================
   FMS API Calls
========================= */

const getTrip = tripNo =>
  fmsFetch(`/fms-platform-dispatch-management/TripDetail/GetTrip?tripNo=${tripNo}`);

const getStopList = tripNo =>
  fmsFetch(`/fms-platform-dispatch-management/TripDetail/GetStopList?tripNo=${tripNo}`);

const getTaskList = tripNo =>
  fmsFetch(`/fms-platform-dispatch-management/TripDetail/GetTaskList?tripNo=${tripNo}`);

const getTripStatistics = tripNo =>
  fmsFetch(`/fms-platform-dispatch-management/TripDetail/GetTripStatistics?tripNo=${tripNo}`);

const getTripTracking = tripNo =>
  fmsFetch(
    `/fms-platform-dispatch-management/Trips/GetAllTrackingByTripId`,
    {
      method: "POST",
      body: JSON.stringify({ trip_no: tripNo })
    }
  );

const getTripFiles = tripNo =>
  fmsFetch(
    `/fms-platform-dispatch-management/Trips/GetFileInfoByTripId`,
    {
      method: "POST",
      body: JSON.stringify({ trip_no: tripNo })
    }
  );

const getTripHistory = tripNo =>
  fmsFetch(`/fms-platform-dispatch-management/Trips/GetTripHistory?tripNo=${tripNo}`);

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
