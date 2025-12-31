/**
 * FMS/API/Trip/trip.files.js
 * NORMALIZED SIGNATURE: (ctx, tripNo)
 */

export async function getTripFiles(ctx, tripNo) {
  if (!tripNo) throw new Error("getTripFiles: tripNo is required");

  const url =
    "https://fms.item.com/fms-platform-dispatch-management/Trips/GetFileInfoByTripId";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: ctx.authorization,
      "fms-token": ctx.fmsToken,
      "company-id": ctx.companyId,
      "fms-client": "FMS_WEB"
    },
    body: JSON.stringify({ trip_no: tripNo })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TripFiles API failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json?.data?.files || [];
}