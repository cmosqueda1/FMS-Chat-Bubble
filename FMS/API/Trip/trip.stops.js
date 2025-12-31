/**
 * FMS/API/Trip/trip.stops.js
 * NORMALIZED SIGNATURE: (ctx, tripNo)
 */

export async function getTripStops(ctx, tripNo) {
  if (!tripNo) throw new Error("getTripStops: tripNo is required");

  const url =
    "https://fms.item.com/fms-platform-dispatch-management/TripDetail/GetStopList" +
    `?tripNo=${encodeURIComponent(tripNo)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: ctx.authorization,
      "fms-token": ctx.fmsToken,
      "company-id": ctx.companyId,
      "fms-client": "FMS_WEB"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TripStops API failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json?.data?.stop_list || [];
}