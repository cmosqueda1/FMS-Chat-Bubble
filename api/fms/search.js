import { fmsFetch } from "./utils/fmsFetch.js";
import { ensureFmsAuth } from "../tms/auth.js";

/*
  Reusable search logic WITH AUTH
*/
export async function runSearch(keyword) {
  if (!keyword) {
    throw new Error("Missing search keyword");
  }

  // 🔴 ENSURE AUTH BEFORE FETCH
  await ensureFmsAuth();

  const search = await fmsFetch(
    `https://fms.item.com/fms-platform-dispatch-management/search-all?Keyword=${encodeURIComponent(keyword)}`
  );

  const raw = search?.data || {};

  const entities = {
    orders: (raw.orders || []).map(o => ({
      do: o.order_no,
      pro: o.pro_no
    })),

    trips: (raw.trips || []).map(t => ({
      tripNo: t.trip_no
    })),

    linehaulTasks: (raw.lhs || []).map(lh => ({
      taskNo: lh.task_no,
      pro: lh.pro_no
    })),

    summary: raw.summary || []
  };

  const counts = {
    orders: entities.orders.length,
    trips: entities.trips.length,
    linehaulTasks: entities.linehaulTasks.length
  };

  return { keyword, counts, entities };
}

/*
  API endpoint (unchanged behavior)
*/
export default async function handler(req, res) {
  try {
    const { keyword } = req.query;
    const result = await runSearch(keyword);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
