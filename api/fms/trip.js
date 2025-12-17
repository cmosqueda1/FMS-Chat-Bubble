export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    route: "/api/fms/trip",
    query: req.query,
    ts: new Date().toISOString()
  });
}
