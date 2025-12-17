import { fmsFetch } from "./_fmsClient.js";

export default async function handler(req, res) {
  try {
    const { do: orderNo } = req.query;

    if (!orderNo) {
      return res.status(400).json({
        success: false,
        error: "Missing DO (order number)"
      });
    }

    const data = await fmsFetch(
      "https://fms.item.com/fms-platform-order/shipment-orders/query",
      {
        method: "POST",
        body: JSON.stringify({
          order_no: orderNo
        })
      }
    );

    const order = data?.data?.[0];

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    const normalized = {
      do: order.order_no ?? null,
      pro: order.tracking_pro ?? null,
      status: order.status ?? null,
      pickupDate: order.pickup_complete_date ?? null,
      deliveryDate: order.delivery_date ?? null,
      shipperTerminal: order.shipper_terminal ?? null,
      consigneeTerminal: order.consignee_terminal ?? null,
      currentTerminal: order.current_terminal ?? null,
      serviceType: order.service_type ?? null,
      pallets: order.plts ?? null,
      weight: order.weight ?? null
    };

    return res.status(200).json({
      success: true,
      order: normalized
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
