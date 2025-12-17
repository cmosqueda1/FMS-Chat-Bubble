// api/fms/tripService.js
import { normalizeTrip } from "./tripAdapter.js";

export async function fetchAndNormalizeTrip(tripNo, tokenCtx) {
  const rawTrip = await fetchTripFromFMS(tripNo, tokenCtx);
  return normalizeTrip(rawTrip);
}

async function fetchTripFromFMS(tripNo, tokenCtx) {
  const res = await fetch(
    `https://fms.item.com/fms-platform-dispatch/trip/detail?tripNo=${tripNo}`,
    {
      headers: {
        "fms-token": tokenCtx.fmsToken,
        "authorization": tokenCtx.authToken,
        "fms-client": "FMS_WEB"
      }
    }
  );

  if (!res.ok) {
    throw new Error(`FMS trip fetch failed: ${res.status}`);
  }

  return res.json();
}
