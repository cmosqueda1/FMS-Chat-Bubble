export function detectIntent(message) {
  const text = message.trim().toLowerCase();

  const proMatch = text.match(/\b\d{6,11}\b/);
  const tripMatch = text.match(/\b[bB]\d{2}[a-zA-Z0-9]{3}\b/);

  if (text.includes("file") || text.includes("pod") || text.includes("bol")) {
    return { type: "FILES" };
  }

  if (tripMatch) {
    return { type: "TRIP_LOOKUP", tripNo: tripMatch[0].toUpperCase() };
  }

  if (proMatch) {
    return { type: "SHIPMENT_LOOKUP", value: proMatch[0] };
  }

  return { type: "UNKNOWN" };
}
