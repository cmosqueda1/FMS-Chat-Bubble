export default async function handler(req, res) {
  const r = await fetch("https://example.com");
  res.status(200).json({ ok: true, status: r.status });
}
