/**
 * FMS/API/Trip/trip.tasks.js
 * NORMALIZED SIGNATURE: (ctx, tripNo)
 */

export async function getTripTasks(ctx, tripNo) {
  if (!tripNo) throw new Error("getTripTasks: tripNo is required");

  const url =
    "https://fms.item.com/fms-platform-dispatch-management/TripDetail/GetTaskList" +
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
    throw new Error(`TripTasks API failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}