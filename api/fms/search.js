import { fmsFetch } from "../../api/fms/utils/fmsFetch.js";

/*
  Shared FMS search logic.
  Safe to be used by chatRouter and API wrappers.
*/
export async function runSearch(keyword) {
  if (!keyword) {
    throw new Error("Missing search keyword");
  }

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

  return {
    keyword,
    counts,
    entities
  };
}
