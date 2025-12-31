/**
 * FMS/API/Trip/trip.history.js
 * NORMALIZED SIGNATURE: (ctx, tripNo)
 */

export async function getTripHistory(ctx, tripNo) {
  if (!tripNo) throw new Error("getTripHistory: tripNo is required");

  const url =
    "https://fms.item.com/fms-platform-dispatch-management/Trips/GetTripHistory" +
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
    throw new Error(`TripHistory API failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json?.data?.trip_history_list || [];
}