/**
 * FMS/API/auth.login.server.js
 *
 * Browser-equivalent FMS authentication
 * REQUIRED to receive third_party_token
 * Includes hard timeout to prevent hanging requests
 */

const BASE = "https://fms.item.com";
const LOGIN_URL = `${BASE}/fms-platform-user/Auth/Login`;

const FMS_CLIENT = "FMS_WEB";
const COMPANY_ID = "SBFH";

/**
 * Logs into FMS and returns BOTH tokens
 * Hard-fails after timeout to prevent /api/search from hanging
 */
export async function fmsLogin() {
  const account = "sysacct";
  const password = "Unis123!";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

  let res;
  try {
    res = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "fms-client": FMS_CLIENT
      },
      body: JSON.stringify({ account, password }),
      signal: controller.signal
    });
  } catch (err) {
    throw new Error(
      `FMS login request failed or timed out: ${err.name || err.message}`
    );
  } finally {
    clearTimeout(timeout);
  }

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      `FMS login failed (${res.status}): ${JSON.stringify(json)}`
    );
  }

  const data = json?.data || {};

  if (!data.token || !data.third_party_token) {
    throw new Error(
      `FMS login did not return required tokens: ${JSON.stringify(data)}`
    );
  }

  return {
    fmsToken: data.token,
    authorization: data.third_party_token,
    companyId: COMPANY_ID,
    expiresIn: 7200
  };
}