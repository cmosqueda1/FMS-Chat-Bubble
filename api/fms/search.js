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

    // Normalize results for chatbot use
    const raw = data?.data;

    const list = Array.isArray(raw)
      ? raw
      : raw
        ? [raw]
        : [];
    
    const results = list.map(r => ({
      tripNo: r.trip_no ?? null,
      tripId: r.trip_id ?? null,
      pro: r.tracking_pro ?? null,
      do: r.order_no ?? null,
      pu: r.pickup_no ?? null,
      taskType: r.task_type ?? null,
      status: r.status ?? null,
      terminal: r.current_terminal ?? null
    }));


    return res.status(200).json({
      success: true,
      count: results.length,
      results
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
