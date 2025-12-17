import { detectIntent } from "./intent.js";
import { getSession, saveSession } from "./session.js";

import getShipmentByPro from "../fms/shipment-by-pro.js";
import getTripByPro from "../fms/trip-by-pro.js";
import getOrderFiles from "../fms/files-by-do.js";
import getTripFiles from "../fms/files-by-trip.js";

import formatShipmentReply from "./formatter.js";

export default async function handler(req, res) {
  const { message, sessionId } = req.body;
  const session = getSession(sessionId);

  const intent = detectIntent(message);

  // ---------- SHIPMENT LOOKUP ----------
  if (intent.type === "SHIPMENT_LOOKUP") {
    const shipment = await getShipmentByPro(intent.value);

    if (!shipment) {
      return res.json({ reply: "I couldn’t find a shipment for that number." });
    }

    const trip = await getTripByPro(shipment.pro);

    saveSession(sessionId, {
      lastPro: shipment.pro,
      lastDo: shipment.do,
      lastTrip: trip?.tripNo || null
    });

    return res.json({
      reply: formatShipmentReply({ shipment, trip })
    });
  }

  // ---------- FILE LOOKUP ----------
  if (intent.type === "FILES") {
    if (!session.lastPro) {
      return res.json({
        reply: "Please provide a PRO number so I can check files."
      });
    }

    const orderFiles = await getOrderFiles(session.lastDo);
    const tripFiles = session.lastTrip
      ? await getTripFiles(session.lastTrip)
      : [];

    return res.json({
      reply: formatFilesReply({
        pro: session.lastPro,
        trip: session.lastTrip,
        orderFiles,
        tripFiles
      })
    });
  }

  return res.json({
    reply:
      "I can help track shipments and check files.\n" +
      "Try: 'Where is PRO 61719694?'"
  });
}
