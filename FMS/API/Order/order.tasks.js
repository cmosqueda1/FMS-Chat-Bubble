/**
 * FMS/API/Order/order.tasks.js
 *
 * Retrieves task records associated with a single Order.
 * Mirrors Trip task behavior but scoped to Order context.
 *
 * Responsibility:
 * - Fetch Pickup / Delivery / Linehaul tasks tied to an Order
 * - Preserve raw task structure
 * - Apply minimal defensive normalization only
 */

const BASE = "https://fms.item.com";
const ORDER_TASKS_URL =
  `${BASE}/fms-platform-dispatch-management/order/get-order-tasks`;

/**
 * Get Order Tasks
 * @param {object} ctx { fmsToken, authorization, companyId }
 * @param {string} orderNo
 */
export async function getOrderTasks(ctx, orderNo) {
  if (!orderNo) {
    throw new Error("Order number is required");
  }

  const res = await fetch(
    `${ORDER_TASKS_URL}?orderNo=${encodeURIComponent(orderNo)}`,
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
    throw new Error(`Order tasks request failed (${res.status})`);
  }

  const json = await res.json();
  const data = Array.isArray(json?.data) ? json.data : [];

  /**
   * Defensive normalization
   * - Do NOT remap or enrich fields
   * - Preserve structure expected by downstream logic
   */
  return data.map((t) => ({
    task_no: t.task_no ?? null,
    task_type: t.task_type ?? "",
    task_type_group: t.task_type_group ?? "",
    order_no: t.order_no ?? "",
    tracking_no: t.tracking_no ?? "",
    pu_no: t.pu_no ?? "",
    is_show: t.is_show !== false,

    order_shipper_address: t.order_shipper_address || null,
    order_consignee_address: t.order_consignee_address || null,

    raw: t
  }));
}