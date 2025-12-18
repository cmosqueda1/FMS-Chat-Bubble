import { runSearch } from "../../server/fms/search.js";

export default async function handler(req, res) {
  try {
    const { keyword } = req.query;
    const result = await runSearch(keyword);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
