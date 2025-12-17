import { fmsFetch } from "./_fmsClient.js";

export default async function handler(req, res) {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: "Missing search keyword"
      });
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

    // Useful for intent logic later
    const counts = {
      orders: entities.orders.length,
      trips: entities.trips.length,
      linehaulTasks: entities.linehaulTasks.length
    };

    return res.status(200).json({
      success: true,
      keyword,
      counts,
      entities
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
