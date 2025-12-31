import fetch from "node-fetch";

/**
 * FMS/API/Order/order.lhlist.js
 *
 * POST /route-engine-dispatch/linehaul/get-linehaul
 * Payload: { linehaul_no: [250000355435, ...] }
 * Returns: json.data (array)
 */

export async function getLinehaulList(ctx, linehaulNos = []) {
  const list = Array.isArray(linehaulNos)
    ? linehaulNos.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
    : [];

  if (list.length === 0) return [];

  const url =
    "https://fms.item.com/fms-platform-dispatch-management/route-engine-dispatch/linehaul/get-linehaul";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      authorization: ctx.authorization,
      "company-id": ctx.companyId,
      "fms-token": ctx.fmsToken,
      "fms-client": "FMS_WEB"
    },
    body: JSON.stringify({ linehaul_no: list })
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Linehaul get-linehaul failed (${res.status}): ${t}`);
  }

  const json = await res.json();
  return json?.data || [];
}