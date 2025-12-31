/**
 * FMS/API/Order/order.detail.js
 *
 * Retrieves core Order header information.
 * Mirrors Trip detail behavior, but scoped to Order.
 *
 * Responsibility:
 * - Fetch order-level metadata (status, terminals, dates, carrier)
 * - Return raw-normalized payload only
 */

const BASE = "https://fms.item.com";
const ORDER_DETAIL_URL =
  `${BASE}/fms-platform-dispatch-management/order/get-order-detail`;

/**
 * Get Order Detail
 * @param {object} ctx { fmsToken, authorization, companyId }
 * @param {string} orderNo
 */
export async function getOrderDetail(ctx, orderNo) {
  if (!orderNo) {
    throw new Error("Order number is required");
  }

  const res = await fetch(
    `${ORDER_DETAIL_URL}?orderNo=${encodeURIComponent(orderNo)}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "fms-client": "FMS_WEB",
        "fms-token": ctx.fmsToken,
        authorization: ctx.authorization,
        "company-id": ctx.companyId
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Order detail request failed (${res.status})`);
  }

  const json = await res.json();
  const data = json?.data || {};

  /**
   * Defensive normalization
   * (Do NOT transform field names unless required)
   */
  return {
    order_no: data.order_no || data.orderNo || "",
    pro_no: data.pro_no || data.tracking_no || "",
    status_text: data.status_text || data.status || "",
    assign_status_text: data.assign_status_text || "",
    org_terminal: data.org_terminal || "",
    dst_terminal: data.dst_terminal || "",
    carrier: data.carrier || "",
    pickup_date: data.pickup_date || "",
    delivery_date: data.delivery_date || "",
    raw: data
  };
}