const BASE = "https://fms.item.com";

export async function getOrderStatus(auth, orderNo) {
  const url = `${BASE}/fms-platform-order/shipper/getshipment-orderbasic-headinfo/${encodeURIComponent(orderNo)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "fms-client": "FMS_WEB",
      "fms-token": auth.fmsToken,
      authorization: auth.authorization,
      "company-id": auth.companyId
    }
  });
  const json = await res.json();
  return json?.data || null;
}