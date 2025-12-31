import { buildHeaders } from "../_fmsHeaders.js";

const URL = "https://fms.item.com/fms-platform-dispatch-management/TripDetail/GetTrip";

export async function getTrip(tripNo, auth) {
  const res = await fetch(`${URL}?tripNo=${tripNo}`, {
    method: "GET",
    headers: buildHeaders(auth)
  });

  return (await res.json())?.data || null;
}