import { authHeaders } from "./auth.js";

const SEARCH_URL =
  "https://fms.item.com/fms-platform-order/shipment-orders/query";

export default async function getShipmentByPro(pro) {
  const headers = await authHeaders();

  const body = {
    tracking_nos: [pro],
    status: [],
    page_number: 1,
    page_size: 1
  };

  const resp = await fetch(SEARCH_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const json = await resp.json();
  const item = json?.data?.items?.[0];
  if (!item) return null;

  return {
    pro,
    do: item.order_no,
    pu: item.reference5,
    currentLocation: item.current_location,
    serviceTerminal: item.service_terminal
  };
}
