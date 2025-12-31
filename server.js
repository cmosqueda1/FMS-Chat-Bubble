/**
 * server.js
 * FMS Chat Bubble — Deterministic
 *
 * Updates:
 * - Task counts = unique task_no grouped by task_type_group ("Pickup Task", "Delivery Task", "Linehaul Task")
 * - LH API moved to FMS/API/Order/order.lhlist.js
 * - LH numbers extracted from tasks (Linehaul Task) using task_no as LH number
 * - LH data stored under current-context.json -> linehaulData
 * - LH list output: NO SHPR ↓ CNSE details (compact DO/PRO only)
 * - Better visual separation between Pickup | Delivery | LH (horizontal lines)
 *
 * PATCH (ADDITIVE ONLY):
 * - Keyword routing: TRIP vs ORDER vs LINEHAUL based on search.keyword.js type
 * - ORDER loads: status/basic/shipper/consignee/billing/freight/files/pallet/history
 * - LINEHAUL standalone loads: linehaulData only (orders endpoint reuses existing LH rendering)
 * - /api/message supports ORDER context (files/history + new "order" scope)
 */

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import session from "express-session";
import { fileURLToPath } from "url";

/* ---- APIs ---- */
import { fmsLogin } from "./FMS/API/auth.login.server.js";
import { searchKeyword } from "./FMS/API/search.keyword.js";

import { getTripDetail } from "./FMS/API/Trip/trip.detail.js";
import { getTripStops } from "./FMS/API/Trip/trip.stops.js";
import { getTripTasks } from "./FMS/API/Trip/trip.tasks.js";
import { getTripHistory } from "./FMS/API/Trip/trip.history.js";
import { getTripFiles } from "./FMS/API/Trip/trip.files.js";

import { getLinehaulList } from "./FMS/API/Order/order.lhlist.js";

/* ---- ORDER APIs (ADDITIVE) ---- */
import { getOrderStatus } from "./FMS/API/Order/order.status.js";
import { getOrderBasic } from "./FMS/API/Order/order.getbasic.js";
import { getOrderShipper } from "./FMS/API/Order/order.shpr.js";
import { getOrderConsignee } from "./FMS/API/Order/order.cnse.js";
import { getOrderBilling } from "./FMS/API/Order/order.billing.js";
import { getOrderFreightCommodity } from "./FMS/API/Order/order.freightcmmdt.js";
import { getOrderFiles } from "./FMS/API/Order/order.files.js";
import { getOrderPallets } from "./FMS/API/Order/order.pallet.js";
import { getOrderHistory } from "./FMS/API/Order/order.history.js";

/* ===============================
   App Setup
================================ */

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use(
  session({
    secret: "fms-chat-bubble",
    resave: false,
    saveUninitialized: true
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===============================
   TMP CONTEXT (AUTHORITATIVE)
================================ */

const IS_VERCEL = !!process.env.VERCEL;

const TMP_DIR = IS_VERCEL ? "/tmp" : path.join(__dirname, "tmp");
const CONTEXT_FILE = path.join(TMP_DIR, "current-context.json");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function writeContext(data) {
  ensureTmp();
  fs.writeFileSync(CONTEXT_FILE, JSON.stringify(data, null, 2));
}

function readContext() {
  if (!fs.existsSync(CONTEXT_FILE)) return null;
  return JSON.parse(fs.readFileSync(CONTEXT_FILE, "utf8"));
}

function clearContext() {
  if (fs.existsSync(CONTEXT_FILE)) fs.unlinkSync(CONTEXT_FILE);
}

/* Always start clean */
clearContext();

/* ===============================
   Serve UI
================================ */

app.use(express.static(__dirname));

/* ===============================
   RESET
================================ */

app.post("/api/reset", (req, res) => {
  clearContext();
  res.json({ success: true });
});

/* ===============================
   Helpers
================================ */

function safeText(v, fallback = "—") {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isValidHttpUrl(u) {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function formatUploadTime(upload_time) {
  if (!upload_time) return "Unknown time";
  return String(upload_time).split(".")[0];
}

function getLatestHistoryEvent(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  return history
    .slice()
    .sort((a, b) => new Date(b.time) - new Date(a.time))[0];
}

function sectionDivider() {
  return `<hr style="margin:10px 0;border:none;border-top:1px solid #ddd;">`;
}

/**
 * Task counts:
 * - Unique task_no
 * - Grouped by task_type_group (e.g., "Pickup Task", "Delivery Task", "Linehaul Task")
 */
function countUniqueTasksByGroup(tasks) {
  const visible = (Array.isArray(tasks) ? tasks : []).filter((t) => t?.is_show !== false);

  // task_no -> task_type_group
  const seen = new Map();
  for (const t of visible) {
    const taskNo = t?.task_no;
    if (!taskNo) continue;
    if (!seen.has(taskNo)) {
      seen.set(taskNo, safeText(t?.task_type_group, "Unknown"));
    }
  }

  const counts = {
    "Pickup Task": 0,
    "Delivery Task": 0,
    "Linehaul Task": 0,
    Unknown: 0
  };

  for (const grp of seen.values()) {
    if (counts[grp] === undefined) counts.Unknown++;
    else counts[grp]++;
  }

  return {
    total: seen.size,
    byGroup: counts
  };
}

/**
 * Extract LH numbers from tasks where task_type_group === "Linehaul Task"
 * Source of truth: task_no (since LH task count already proves these exist)
 */
function extractLinehaulNosFromTasks(tasks) {
  const visible = (Array.isArray(tasks) ? tasks : []).filter((t) => t?.is_show !== false);
  const set = new Set();

  for (const t of visible) {
    if (t?.task_type_group !== "Linehaul Task") continue;

    const lhNo = Number(t?.task_no);
    if (Number.isFinite(lhNo) && lhNo > 0) set.add(lhNo);
  }

  return Array.from(set);
}

/**
 * Count direct orders from Pickup/Delivery tasks (unique order_no)
 */
function countDirectOrders(tasks) {
  const visible = (Array.isArray(tasks) ? tasks : []).filter((t) => t?.is_show !== false);

  const pickup = new Set();
  const delivery = new Set();

  for (const t of visible) {
    const orderNo = t?.order_no;
    if (!orderNo) continue;

    if (t?.task_type_group === "Pickup Task") pickup.add(orderNo);
    if (t?.task_type_group === "Delivery Task") delivery.add(orderNo);
  }

  return {
    pickup: pickup.size,
    delivery: delivery.size,
    pickupSet: pickup,
    deliverySet: delivery
  };
}

/**
 * Count LH orders from linehaulData (unique order_no across all LHs)
 */
function countLinehaulOrders(linehaulData) {
  const data = Array.isArray(linehaulData) ? linehaulData : [];
  const all = new Set();

  for (const lh of data) {
    const list = Array.isArray(lh?.order_list) ? lh.order_list : [];
    for (const o of list) {
      if (o?.order_no) all.add(o.order_no);
    }
  }

  return all.size;
}

/**
 * Build display orders (dedupe by order_no) for Pickup/Delivery tasks
 */
function buildDisplayOrders(tasks, groupName) {
  const visible = (Array.isArray(tasks) ? tasks : []).filter((t) => t?.is_show !== false);
  const seen = new Set();
  const out = [];

  for (const t of visible) {
    if (t?.task_type_group !== groupName) continue;
    const orderNo = t?.order_no;
    if (!orderNo) continue;
    if (seen.has(orderNo)) continue;
    seen.add(orderNo);
    out.push(t);
  }

  return out;
}

/**
 * Render SHPR ↓ CNSE using order_shipper_address/location_name & city
 * and order_consignee_address/location_name & city
 */
function renderShipperConsigneeFromTask(t) {
  const sh = t?.order_shipper_address || {};
  const cn = t?.order_consignee_address || {};

  const shName = safeText(sh.location_name);
  const shCity = safeText(sh.city);
  const shState = safeText(sh.state);

  const cnName = safeText(cn.location_name);
  const cnCity = safeText(cn.city);
  const cnState = safeText(cn.state);

  return `
    <div>${shName} (${shCity}, ${shState})</div>
    <div style="line-height:12px;margin:2px 0;">↓</div>
    <div>${cnName} (${cnCity}, ${cnState})</div>
  `;
}

function renderOrderRowFromTask(t) {
  const DO = safeText(t?.order_no);
  const PRO = safeText(t?.tracking_no);
  const PU = safeText(t?.pu_no);

  return `
    <div style="margin-bottom:10px;">
      <div><strong>${DO}</strong> | PRO ${PRO} | PU ${PU}</div>
      <div style="margin-top:4px;">
        ${renderShipperConsigneeFromTask(t)}
      </div>
    </div>
  `;
}

/**
 * LH orders — COMPACT display (no shipper/consignee block)
 */
function renderSimpleLHOrderRow(o) {
  const DO = safeText(o?.order_no);
  const PRO = safeText(o?.tracking_no);

  return `
    <div style="margin:2px 0 6px 0;">
      <strong>${DO}</strong> | PRO ${PRO}
    </div>
  `;
}


/* ===============================
   SEARCH
================================ */

app.post("/api/search", async (req, res) => {
  try {
    clearContext();

    const keyword = String(req.body?.keyword || "").trim();
    if (!keyword) {
      return res.json({ reply: "Enter a Trip, Order, or Linehaul number." });
    }

    /* AUTH */
    if (!req.session.token || !req.session.authorization) {
      const login = await fmsLogin();
      req.session.token = login.fmsToken;
      req.session.authorization = login.authorization;
    }

    const ctx = {
      fmsToken: req.session.token,
      authorization: req.session.authorization,
      companyId: "SBFH"
    };

    /* Resolve keyword → TRIP | ORDER | LINEHAUL (strict routing enforced in search.keyword.js) */
    const search = await searchKeyword(keyword, ctx);

    /* ===============================
       ORDER ROUTE (ADDITIVE)
    ================================ */
    if (search?.type === "ORDER") {
      const orderNo =
        search?.orderNo ||
        (Array.isArray(search.orders) && search.orders[0]?.order_no) ||
        null;

      const proNo =
        search?.proNo ||
        (Array.isArray(search.orders) && search.orders[0]?.pro_no) ||
        null;

      if (!orderNo) {
        clearContext();
        return res.json({ reply: "No matching Order found." });
      }

      // Pull ORDER APIs (parallel)
      const [
        orderStatus,
        orderBasic,
        shipper,
        consignee,
        billing,
        freight,
        orderFiles,
        pallets,
        orderHistory
      ] = await Promise.all([
        getOrderStatus(ctx, orderNo).catch(() => null),
        getOrderBasic(ctx, orderNo).catch(() => null),
        getOrderShipper(ctx, orderNo).catch(() => null),
        getOrderConsignee(ctx, orderNo).catch(() => null),
        getOrderBilling(ctx, orderNo).catch(() => null),
        getOrderFreightCommodity(ctx, orderNo).catch(() => null),
        getOrderFiles(ctx, orderNo).catch(() => []),
        getOrderPallets(ctx, orderNo).catch(() => []),
        getOrderHistory(ctx, orderNo).catch(() => [])
      ]);

      writeContext({
        contextType: "ORDER",
        orderNo,
        proNo,
        orderStatus,
        orderBasic,
        shipper,
        consignee,
        billing,
        freight,
        orderFiles,
        pallets,
        orderHistory,
        // keep these keys for compatibility with existing message handlers (they will be empty)
        tripNo: null,
        detail: null,
        stops: [],
        tasks: [],
        history: [],
        files: [],
        linehaulData: [],
        _raw: { searchResult: search }
      });

      // Build deterministic summary for ORDER
      const statusTxt = safeText(orderStatus?.order_status_describe, "Unknown");
      const subStatusTxt = safeText(orderStatus?.order_sub_status_describe, "Unknown");

      const shipperTerminal = safeText(orderBasic?.shipper_terminal, "");
      const consigneeTerminal = safeText(orderBasic?.consignee_terminal, "");
      const currentLoc = safeText(orderBasic?.current_location, "");

      // pallets summary
      const palletCount = Array.isArray(pallets) ? pallets.length : 0;

      // freight summary
      const estList = freight?.estimate_freights || [];
      const firstFreight = Array.isArray(estList) && estList.length ? estList[0] : null;
      const freightDesc = safeText(firstFreight?.description, "");
      const freightQty = safeNum(firstFreight?.quantity);
      const freightWeight = safeNum(firstFreight?.weight);

      return res.json({
        contextType: "ORDER",
        summary: {
          orderNo,
          proNo: proNo || safeText(orderBasic?.pro_no, ""),
          status: statusTxt,
          subStatus: subStatusTxt,
          terminals: shipperTerminal && consigneeTerminal ? `${shipperTerminal} → ${consigneeTerminal}` : "",
          currentLocation: currentLoc,
          pallets: palletCount,
          freight: freightDesc ? `${freightDesc}${freightQty ? ` | Qty ${freightQty}` : ""}${freightWeight ? ` | Wt ${freightWeight}` : ""}` : ""
        }
      });
    }

    /* ===============================
       LINEHAUL ROUTE (ADDITIVE)
    ================================ */
    if (search?.type === "LINEHAUL") {
      const lhNo =
        search?.lhNo ||
        (Array.isArray(search.linehauls) && (search.linehauls[0]?.task_no || search.linehauls[0]?.linehaul_no)) ||
        null;

      const lhNum = safeNum(lhNo);

      if (!lhNum) {
        clearContext();
        return res.json({ reply: "No matching Linehaul found." });
      }

      let linehaulData = [];
      try {
        linehaulData = await getLinehaulList(ctx, [lhNum]);
      } catch (e) {
        linehaulData = [{ _error: safeText(e?.message, "LH load failed") }];
      }

      writeContext({
        contextType: "LINEHAUL",
        // keep trip fields empty
        tripNo: null,
        detail: null,
        stops: [],
        tasks: [],
        history: [],
        files: [],
        // keep LH data as usual so orders endpoint works
        linehaulData,
        _raw: { searchResult: search }
      });

      const lhError = linehaulData.length === 1 && linehaulData[0]?._error;
      const lhOrders = lhError ? 0 : countLinehaulOrders(linehaulData);

      const lh = !lhError && Array.isArray(linehaulData) && linehaulData.length
        ? linehaulData[0]
        : {};

      const lhStatusMap = {
        1: "PrePlan",
        2: "Load Building",
        3: "Dispatched",
        4: "Departed",
        5: "InTransit",
        6: "Arrived",
        7: "Complete",
        8: "DryRun",
        9: "Cancelled"
      };

      const lhHeader = Array.isArray(linehaulData) && linehaulData.length
        ? linehaulData[0]
        : {};

      return res.json({
        contextType: "LINEHAUL",
        summary: {
          linehaulNo: String(lhNum),
          tripNo: safeText(lhHeader.trip_no, "—"),
          org_terminal: safeText(lhHeader.org_terminal, "—"),
          dst_terminal: safeText(lhHeader.dst_terminal, "—"),
          status: safeText(lhHeader.linehaul_status_text, "Unknown"),
          orders: lhOrders,
          error: lhError ? safeText(lhError) : ""
        }
      });
    }

    /* ===============================
       TRIP ROUTE (BASELINE — MINIMALLY TOUCHED)
       (Only changed from “Resolve keyword → Trip” to strict trip routing.)
    ================================ */

    const tripNo =
      search.tripNo ||
      (Array.isArray(search.tripNos) && search.tripNos[0]);

    if (!tripNo) {
      clearContext();
      return res.json({ reply: "No matching Trip found." });
    }

    /* Pull Trip APIs */
    const [detail, stops, tasks, history] = await Promise.all([
      getTripDetail(ctx, tripNo),
      getTripStops(ctx, tripNo),
      getTripTasks(ctx, tripNo),
      getTripHistory(ctx, tripNo)
    ]);

    /* Files (permission-dependent) */
    let files = [];
    try {
      files = await getTripFiles(ctx, tripNo);
    } catch {
      files = [];
    }

    /* LH Data (after Trip APIs) */
    let linehaulData = [];
    try {
      const lhNos = extractLinehaulNosFromTasks(tasks);
      if (lhNos.length > 0) {
        linehaulData = await getLinehaulList(ctx, lhNos);
      }
    } catch (e) {
      linehaulData = [{ _error: safeText(e?.message, "LH load failed") }];
    }

    writeContext({
      contextType: "TRIP",
      tripNo,
      detail,
      stops,
      tasks,
      history,
      files,
      linehaulData,
      _raw: { searchResult: search }
    });

    /* Summary counts MUST come from unique task_no grouped by task_type_group */
    const taskCounts = countUniqueTasksByGroup(tasks);

    return res.json({
      contextType: "TRIP",
      summary: {
        tripNo,
        status: detail?.status_text || detail?.assign_status_text || "Unknown",
        dispatchDate: detail?.dispatch_date || "",
        route: `${detail?.org_terminal || ""} → ${detail?.dst_terminal || ""}`,
        deliveries: taskCounts.byGroup["Delivery Task"] || 0,
        pickups: taskCounts.byGroup["Pickup Task"] || 0,
        linehauls: taskCounts.byGroup["Linehaul Task"] || 0
      }
    });

  } catch (err) {
    clearContext();
    res.status(500).json({ error: err.message || String(err) });
  }
});

/* ===============================
   MESSAGE (DETERMINISTIC)
================================ */

app.post("/api/message", (req, res) => {
  const ctx = readContext();
  if (!ctx) return res.json({ reply: "Search for a trip first." });

  const { scope, action } = req.body;

  /* ===============================
     ORDER CONTEXT (ADDITIVE)
     - New scope: "order"
     - Reuse existing "files" + "history" scopes but with order payloads
  ================================ */

  if (ctx.contextType === "ORDER") {
    /* ORDER DETAILS */
    if (scope === "order") {
      const orderNo = safeText(ctx.orderNo, "—");
      const proNo = safeText(ctx.proNo || ctx.orderBasic?.pro_no, "—");

      if (action === "basic") {
        const b = ctx.orderBasic || {};
        const puNo = safeText(b.reference5, "—");

        return res.json({
          reply: `
            <div><strong>${orderNo}</strong> | PRO ${safeText(b.pro_no, proNo)}</div>
            <div style="margin-top:6px;"><strong>PU:</strong> ${puNo}</div>
            <div><strong>Current Location:</strong> ${safeText(b.current_location, "—")}</div>
            <div><strong>Service Level:</strong> ${safeText(b.service_level, "—")}</div>
            <div><strong>Terminals:</strong> ${safeText(b.shipper_terminal, "—")} → ${safeText(b.consignee_terminal, "—")}</div>
            <div><strong>Tracking:</strong> ${safeText(b.tracking_no, "—")}</div>
          `
        });
      }

      if (action === "basic") {
        const b = ctx.orderBasic || {};
        const puNo = safeText(b.reference5, "—");

        return res.json({
          reply: `
            <div><strong>${orderNo}</strong> | PRO ${safeText(b.pro_no, proNo)}</div>
            <div style="margin-top:6px;"><strong>PU:</strong> ${puNo}</div>
            <div><strong>Current Location:</strong> ${safeText(b.current_location, "—")}</div>
            <div><strong>Service Level:</strong> ${safeText(b.service_level, "—")}</div>
            <div><strong>Terminals:</strong> ${safeText(b.shipper_terminal, "—")} → ${safeText(b.consignee_terminal, "—")}</div>
            <div><strong>Tracking:</strong> ${safeText(b.tracking_no, "—")}</div>
          `
        });
      }

      if (action === "shipper") {
        const s = ctx.shipper || {};
        return res.json({
          reply: `
            <div><strong>Shipper</strong></div>
            <div style="margin-top:6px;"><strong>Name:</strong> ${safeText(s.name, "—")}</div>
            <div><strong>Address:</strong> ${safeText(s.address, "—")}</div>
            <div><strong>Contact:</strong> ${safeText(s.contact, "—")} | ${safeText(s.phone, "—")}</div>
            <div><strong>Appt:</strong> ${safeText(s.appointment_date, "—")} ${safeText(s.open_time, "")}–${safeText(s.close_time, "")}</div>
          `
        });
      }

      if (action === "consignee") {
        const c = ctx.consignee || {};
        return res.json({
          reply: `
            <div><strong>Consignee</strong></div>
            <div style="margin-top:6px;"><strong>Name:</strong> ${safeText(c.name, "—")}</div>
            <div><strong>Address:</strong> ${safeText(c.address, "—")}</div>
            <div><strong>Contact:</strong> ${safeText(c.contact, "—")} | ${safeText(c.phone, "—")}</div>
            <div><strong>Appt:</strong> ${safeText(c.appointment_date, "—")} ${safeText(c.appointment_from, "")}–${safeText(c.appointment_to, "")}</div>
          `
        });
      }

      if (action === "billing") {
        const b = ctx.billing || {};
        return res.json({
          reply: `
            <div><strong>Billing</strong></div>
            <div style="margin-top:6px;"><strong>Freight Term:</strong> ${safeText(b.freight_term, "—")}</div>
            <div><strong>Bill To:</strong> ${safeText(b.bill_to_name, "—")} (${safeText(b.bill_to_account_id, "—")})</div>
            <div><strong>Address:</strong> ${safeText(b.address1, "—")} ${safeText(b.address2, "")} ${safeText(b.city, "")}, ${safeText(b.state, "")} ${safeText(b.zipcode, "")}</div>
            <div><strong>Contact:</strong> ${safeText(b.primary_contact, "—")} | ${safeText(b.phone, "—")} | ${safeText(b.email, "—")}</div>
          `
        });
      }

      if (action === "freight") {
        const f = ctx.freight || {};
        const list = Array.isArray(f.estimate_freights) ? f.estimate_freights : [];
        if (list.length === 0) return res.json({ reply: "No freight commodity records found." });

        const html = list
          .map((x) => {
            return `
              <div style="margin-bottom:10px;">
                <div><strong>${safeText(x.description, "—")}</strong></div>
                <div>Class ${safeText(x.freight_class, "—")} | Qty ${safeText(x.quantity, "—")} ${safeText(x.quantity_uom, "")} | Wt ${safeText(x.weight, "—")}</div>
              </div>
            `;
          })
          .join("");

        return res.json({ reply: html });
      }

      if (action === "pallets") {
        const pallets = Array.isArray(ctx.pallets) ? ctx.pallets : [];
        if (pallets.length === 0) {
          return res.json({ reply: "No pallet records found." });
        }

        const html = `
          <div style="margin-bottom:6px;"><strong>Pallets (${pallets.length})</strong></div>
          ${pallets
            .map((p) => {
              return `
                <div style="margin-bottom:10px;">
                  <div><strong>${safeText(p.package_no_or_pallet_no, "—")}</strong></div>
                  <div>Loc ${safeText(p.current_location, "—")} | Qty ${safeText(p.pick_up_quantity, "—")} ${safeText(p.quantity_uom, "")} | Wt ${safeText(p.weight, "—")}</div>
                  <div>${safeText(p.length, "—")}x${safeText(p.width, "—")}x${safeText(p.height, "—")} | Dock ${safeText(p.dock_location_name, "—")}</div>
                </div>
              `;
            })
            .join("")}
        `;

        return res.json({ reply: html });
      }

      return res.json({ reply: "Unsupported order question." });
    }

    /* FILES (ORDER) */
    if (scope === "files") {
      const files = Array.isArray(ctx.orderFiles) ? ctx.orderFiles : [];

      if (action === "count") {
        return res.json({ reply: `Files: ${files.length}` });
      }

      if (action === "list") {
        if (files.length === 0) {
          return res.json({ reply: "No files attached to this order." });
        }

        const groups = {};
        for (const f of files) {
          const k = safeText(f.file_type, "FILE");
          if (!groups[k]) groups[k] = [];
          groups[k].push(f);
        }

        const html = Object.entries(groups)
          .map(([type, list]) => {
            const header = `<div style="margin:0 0 6px 0;"><strong>${type} (${list.length})</strong></div>`;
            const items = list
              .map((f) => {
                const url = f.file_url || f.preview_url;
                const link = isValidHttpUrl(url)
                  ? `<a href="${url}" target="_blank" rel="noopener noreferrer">View File</a>`
                  : "<span style='color:#999;'>No link</span>";

                return `
                  <div style="margin:0 0 8px 0;">
                    ${link}<br/>
                    <span style="color:#666;font-size:12px;">Source: ${safeText(f.source_type, "—")} | Suffix: ${safeText(f.file_suffix, "—")}</span>
                  </div>
                `;
              })
              .join("");

            return `<div style="margin-bottom:10px;">${header}${items}</div>`;
          })
          .join("");

        return res.json({ reply: html });
      }

      return res.json({ reply: "Unsupported files question." });
    }

    /* HISTORY (ORDER) */
    if (scope === "history") {
      const history = Array.isArray(ctx.orderHistory) ? ctx.orderHistory : [];

      if (action === "latest") {
        if (history.length === 0) return res.json({ reply: "No order history events found." });
        const latest = history
          .slice()
          .sort((a, b) => new Date(b.event_time) - new Date(a.event_time))[0];

        return res.json({
          reply: `
            <div>${safeText(latest.event, "—")}</div>
            <div style="margin-top:6px;color:#666;font-size:12px;">${safeText(latest.event_time, "—")} | ${safeText(latest.user_name, "—")}</div>
          `
        });
      }

      if (action === "count") {
        return res.json({ reply: `History events: ${history.length}` });
      }

      return res.json({ reply: "Unsupported history question." });
    }

    return res.json({ reply: "Unsupported scope." });
  }

  /* ===============================
     BASELINE CONTEXTS (TRIP / LINEHAUL)
     - Existing logic preserved exactly below
  ================================ */

  /* FILES */
  if (scope === "files") {
    const files = Array.isArray(ctx.files) ? ctx.files : [];

    if (action === "count") {
      return res.json({ reply: `Files: ${files.length}` });
    }

    if (action === "list") {
      if (files.length === 0) {
        return res.json({ reply: "No files attached to this trip." });
      }

      const groups = {};
      for (const f of files) {
        const k = safeText(f.file_type, "FILE");
        if (!groups[k]) groups[k] = [];
        groups[k].push(f);
      }

      const html = Object.entries(groups)
        .map(([type, list]) => {
          const header = `<div style="margin:0 0 6px 0;"><strong>${type} (${list.length})</strong></div>`;
          const items = list
            .map((f) => {
              const url = f.file_public_url;
              const uploaded = formatUploadTime(f.upload_time);
              const link = isValidHttpUrl(url)
                ? `<a href="${url}" target="_blank" rel="noopener noreferrer">View File</a>`
                : "<span style='color:#999;'>No link</span>";

              return `
                <div style="margin:0 0 8px 0;">
                  ${link}<br/>
                  <span style="color:#666;font-size:12px;">Uploaded: ${uploaded}</span>
                </div>
              `;
            })
            .join("");

          return `<div style="margin-bottom:10px;">${header}${items}</div>`;
        })
        .join("");

      return res.json({ reply: html });
    }

    return res.json({ reply: "Unsupported files question." });
  }

  /* ORDERS */
  if (scope === "orders") {
    const tasks = Array.isArray(ctx.tasks) ? ctx.tasks : [];
    const linehaulData = Array.isArray(ctx.linehaulData) ? ctx.linehaulData : [];

    const lhError = linehaulData.length === 1 && linehaulData[0]?._error;
    const lhOrders = lhError ? 0 : countLinehaulOrders(linehaulData);

    /* ===============================
      LINEHAUL CONTEXT — COUNT ONLY
      =============================== */
    if (ctx.contextType === "LINEHAUL" && action === "count") {
      return res.json({
        reply: `<div><strong>Orders:</strong> ${lhOrders}</div>`
      });
    }

    /* ===============================
      TRIP CONTEXT (UNCHANGED)
      =============================== */

    const taskCounts = countUniqueTasksByGroup(tasks);
    const direct = countDirectOrders(tasks);

    // Rule: total orders = delivery + pickup + LH orders
    const totalOrders = direct.pickup + direct.delivery + lhOrders;

    if (action === "count") {
      const reply = `
        <div><strong>Tasks:</strong> ${taskCounts.total}
          | Pickup (${taskCounts.byGroup["Pickup Task"] || 0})
          - Delivery (${taskCounts.byGroup["Delivery Task"] || 0})
          - LH (${taskCounts.byGroup["Linehaul Task"] || 0})
        </div>
        <div style="margin-top:6px;"><strong>Orders:</strong> ${totalOrders}</div>
        ${lhError ? `<div style="margin-top:6px;color:#b00020;"><strong>LH Data:</strong> ${safeText(lhError)}</div>` : ""}
      `;
      return res.json({ reply });
    }

    if (action === "list") {
      const pickupOrders = buildDisplayOrders(tasks, "Pickup Task");
      const deliveryOrders = buildDisplayOrders(tasks, "Delivery Task");

      const pickupHtml =
        pickupOrders.length > 0
          ? pickupOrders.map(renderOrderRowFromTask).join("")
          : `<div style="color:#666;margin:4px 0 10px 0;">None</div>`;

      const deliveryHtml =
        deliveryOrders.length > 0
          ? deliveryOrders.map(renderOrderRowFromTask).join("")
          : `<div style="color:#666;margin:4px 0 10px 0;">None</div>`;

      let lhHeader = "";
      let lhBody = "";

      if (lhError) {
        lhHeader = `<div style="margin-top:10px;"><strong>LH</strong></div>`;
        lhBody = `<div style="color:#b00020;margin-top:4px;">${safeText(lhError)}</div>`;
      } else {
        const lhCount = linehaulData.length;
        const lhTotalOrders = lhOrders;

        lhHeader = `
          <div style="margin-top:10px;">
            <strong>LH (${lhCount}) - (${lhTotalOrders} orders)</strong>
          </div>
        `;

        lhBody = linehaulData
          .map((lh) => {
            const lhNo = safeText(lh?.linehaul_no);
            const org = safeText(lh?.org_terminal);
            const dst = safeText(lh?.dst_terminal);

            const orders = Array.isArray(lh?.order_list) ? lh.order_list : [];

            const header = `
              <div style="margin-top:8px;">
                <strong>LH ${lhNo}</strong> | ${org} → ${dst}:
              </div>
            `;

            const items =
              orders.length > 0
                ? orders.map(renderSimpleLHOrderRow).join("")
                : `<div style="color:#666;margin-top:4px;">None</div>`;

            return `${header}${items}`;
          })
          .join('<div style="margin:10px 0;"></div>');
      }

      const html = `
        <div><strong>Pickup (${direct.pickup})</strong></div>
        ${pickupHtml}

        ${sectionDivider()}

        <div><strong>Delivery (${direct.delivery})</strong></div>
        ${deliveryHtml}

        ${sectionDivider()}

        ${lhHeader}
        ${lhBody}
      `;

      return res.json({ reply: html });
    }

    return res.json({ reply: "Unsupported orders question." });
  }

  /* HISTORY */
  if (scope === "history") {
    const history = Array.isArray(ctx.history) ? ctx.history : [];

    if (action === "latest") {
      const e = getLatestHistoryEvent(history);
      if (!e) return res.json({ reply: "No trip history events found." });

      return res.json({
        reply: `
          ${safeText(e.event_description)}<br/>
          By ${safeText(e.user)} @ ${safeText(e.system_from)}
        `
      });
    }

    if (action === "count") {
      return res.json({ reply: `History events: ${history.length}` });
    }

    return res.json({ reply: "Unsupported history question." });
  }

  return res.json({ reply: "Unsupported scope." });
});

/* =============================== */

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`FMS Chat Bubble running on http://localhost:${PORT}`);
  });
}

export default app;
