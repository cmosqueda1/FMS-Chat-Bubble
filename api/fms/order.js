import { fmsFetch } from "./_fmsClient.js";

async function safeFetch(label, fn) {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

export default async function handler(req, res) {
  try {
    const { do: orderNo } = req.query;

    if (!orderNo) {
      return res.status(400).json({
        success: false,
        error: "Missing DO parameter"
      });
    }

    const base = "https://fms.item.com/fms-platform-order";

    const results = await Promise.all([
      safeFetch("headInfo", () =>
        fmsFetch(`${base}/shipper/getshipment-orderbasic-headinfo/${orderNo}`)
      ),

      safeFetch("shipperBasic", () =>
        fmsFetch(`${base}/shipper/getshipment-orderbasic/${orderNo}`)
      ),

      safeFetch("shipperFull", () =>
        fmsFetch(`${base}/shipper/${orderNo}`)
      ),

      safeFetch("consignee", () =>
        fmsFetch(`${base}/consignee/${orderNo}`)
      ),

      safeFetch("billing", () =>
        fmsFetch(
          `${base}/billing-information/getbillinginformationbyid?order_no=${orderNo}`
        )
      ),

      safeFetch("accessorials", () =>
        fmsFetch(
          `${base}/shipment-orders/acclist?orderNo=${orderNo}`
        )
      ),

      safeFetch("estimate", () =>
        fmsFetch(`${base}/estimate-freight/${orderNo}`)
      )
    ]);

    const [
      headInfo,
      shipperBasic,
      shipperFull,
      consignee,
      billing,
      accessorials,
      estimate
    ] = results;

    return res.status(200).json({
      success: true,
      orderNo,
      raw: {
        headInfo,
        shipperBasic,
        shipperFull,
        consignee,
        billing,
        accessorials,
        estimate
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
