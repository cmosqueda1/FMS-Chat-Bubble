/**
 * FMS/API/Trip/trip.detail.js
 * NORMALIZED SIGNATURE: (ctx, tripNo)
 */

export async function getTripDetail(ctx, tripNo) {
  if (!tripNo) throw new Error("getTripDetail: tripNo is required");

  const url =
    "https://fms.item.com/fms-platform-dispatch-management/TripDetail/GetTrip" +
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
    throw new Error(`TripDetail API failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  if (!json?.is_success || !json?.data) {
    throw new Error("TripDetail API returned no data");
  }

  return json.data;
}