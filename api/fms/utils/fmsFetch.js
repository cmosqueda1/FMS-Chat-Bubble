let cachedAuth = null;
let tokenExpiry = 0;

export async function fmsFetch(path, options = {}) {
  const baseUrl = process.env.FMS_BASE_URL;
  if (!baseUrl) {
    throw new Error("FMS_BASE_URL not set");
  }

  const auth = await getAuth();

  const headers = {
    "Content-Type": "application/json",
    "fms-client": "FMS_WEB",
    "fms-token": auth.fmsToken,
    "authorization": auth.authorization,
    "company-id": auth.companyId,
    ...(options.headers || {})
  };

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FMS ${res.status}: ${text}`);
  }

  return res.json();
}

/* =========================
   Auth
========================= */

async function getAuth() {
  const now = Date.now();

  if (cachedAuth && now < tokenExpiry) {
    return cachedAuth;
  }

  const res = await fetch(
    "https://fms.item.com/fms-platform-user/Auth/Login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "fms-client": "FMS_WEB"
      },
      body: JSON.stringify({
        account: process.env.FMS_ACCOUNT,
        password: process.env.FMS_PASSWORD
      })
    }
  );

  if (!res.ok) {
    throw new Error("FMS authentication failed");
  }

  const json = await res.json();

  cachedAuth = {
    fmsToken: json.data.token,
    authorization: json.data.third_party_token,
    companyId: process.env.FMS_COMPANY || "SBFH"
  };

  tokenExpiry = now + 55 * 60 * 1000;
  return cachedAuth;
}
