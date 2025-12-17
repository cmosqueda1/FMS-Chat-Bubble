export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    service: "fms-chat-bubble",
    time: new Date().toISOString()
  });
}
