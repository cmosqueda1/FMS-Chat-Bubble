import { getFmsSession } from "./fmsSession.js";

export async function fmsSearch(keyword) {
  const session = getFmsSession();

  const url =
    "https://fms.item.com/fms-platform-dispatch-management/search-all" +
    `?Keyword=${encodeURIComponent(keyword)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "fms-client": "FMS_WEB",
      "company-id": "SBFH",
      "authorization": session.authorization,
      "fms-token": session.fmsToken,
      "cookie": session.cookie
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FMS search failed ${res.status}: ${text}`);
  }

  return res.json();
}
