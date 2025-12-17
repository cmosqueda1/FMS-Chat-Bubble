import { fetchAndNormalizeTrip } from "./fms/tripService.js";

export default async function handler(req, res) {
  try {
    const { tripNo } = req.query;

    if (!tripNo) {
      return res.status(400).json({ error: "tripNo is required" });
    }

    const tokenCtx = {
      fmsToken: req.headers["x-fms-token"],
      authToken: req.headers["x-auth-token"]
    };

    const normalizedTrip = await fetchAndNormalizeTrip(tripNo, tokenCtx);

    res.status(200).json(normalizedTrip);
  } catch (err) {
    res.status(500).json({
      error: err.message || "Trip fetch failed"
    });
  }
}
