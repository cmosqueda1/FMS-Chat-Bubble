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

    return res.status(200).json({
      success: true,
      raw
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
