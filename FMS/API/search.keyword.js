/**
 * FMS/API/search.keyword.js
 *
 * Deterministic keyword resolver using dispatch-management search-all.
 *
 * RULES (LOCKED):
 * 1. summary.category === "order"  → ORDER
 * 2. summary.category === "lh"     → LINEHAUL
 * 3. summary empty AND keyword === trips[].trip_no → TRIP
 * 4. Otherwise → UNSUPPORTED
 */

const BASE = "https://fms.item.com";
const SEARCH_URL = `${BASE}/fms-platform-dispatch-management/search-all`;

/**
 * Resolve keyword into exactly one context.
 *
 * @param {string|object} keyword
 * @param {object} auth { fmsToken, authorization, companyId }
 */
export async function searchKeyword(keyword, auth) {
  // Defensive normalization
  if (typeof keyword === "object" && keyword !== null) {
    keyword = keyword.message || keyword.keyword || "";
  }

  const normalizedKeyword = String(keyword || "")
    .trim()
    .toUpperCase();

  if (!normalizedKeyword) {
    return {
      type: "UNSUPPORTED",
      keyword: "",
      reason: "Empty keyword",
      tripNo: null,
      tripNos: [],
      orders: [],
      linehauls: [],
      _raw: null
    };
  }

  const res = await fetch(
    `${SEARCH_URL}?Keyword=${encodeURIComponent(normalizedKeyword)}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "fms-client": "FMS_WEB",
        "fms-token": auth.fmsToken,
        authorization: auth.authorization || auth.authToken,
        "company-id": auth.companyId
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Search-all failed (${res.status})`);
  }

  const json = await res.json();
  const data = json?.data || {};

  const summary = Array.isArray(data.summary) ? data.summary : [];
  const trips = Array.isArray(data.trips) ? data.trips : [];
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const lhs = Array.isArray(data.lhs) ? data.lhs : [];

  /* ===============================
     RULE 1 — ORDER
     =============================== */
  if (summary.length === 1 && summary[0].category === "order") {
    return {
      type: "ORDER",
      keyword: normalizedKeyword,
      orderNo: summary[0].number,
      proNo: summary[0].pro_no || null,
      tripNo: null,
      tripNos: [],
      orders,
      linehauls: [],
      _raw: json
    };
  }

  /* ===============================
     RULE 2 — LINEHAUL (FIXED)
     =============================== */
  if (summary.length === 1 && summary[0].category === "lh") {
    const lhNo = Number(summary[0].number);

    return {
      type: "LINEHAUL",                 // 🔴 FIX #1
      keyword: normalizedKeyword,
      lhNo: Number.isFinite(lhNo) ? lhNo : null, // 🔴 FIX #2
      proNo: summary[0].pro_no || null,
      tripNo: null,
      tripNos: [],
      orders: [],
      linehauls: lhs,
      _raw: json
    };
  }

  /* ===============================
     RULE 3 — TRIP
     =============================== */
  if (
    summary.length === 0 &&
    trips.length === 1 &&
    trips[0].trip_no === normalizedKeyword
  ) {
    return {
      type: "TRIP",
      keyword: normalizedKeyword,
      tripNo: trips[0].trip_no,
      tripNos: [trips[0].trip_no],
      orders: [],
      linehauls: [],
      _raw: json
    };
  }

  /* ===============================
     UNSUPPORTED
     =============================== */
  return {
    type: "UNSUPPORTED",
    keyword: normalizedKeyword,
    reason: "Search result did not match ORDER, LINEHAUL, or TRIP rules",
    tripNo: null,
    tripNos: [],
    orders,
    linehauls: lhs,
    _raw: json
  };
}