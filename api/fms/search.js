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

    const data = await fmsFetch(
      `https://fms.item.com/fms-platform-dispatch-management/search-all?Keyword=${encodeURIComponent(keyword)}`,
      { method: "GET" }
    );

    const raw = data?.data || {};

    const response = {
      tripNos: (raw.trips || []).map(t => t.trip_no),
      orders: (raw.orders || []).map(o => ({
        do: o.order_no,
        pro: o.pro_no
      })),
      linehaulTasks: (raw.lhs || []).map(lh => ({
        taskNo: lh.task_no,
        pro: lh.pro_no
      })),
      summary: raw.summary || []
    };

    return res.status(200).json({
      success: true,
      keyword,
      resolved: response
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
