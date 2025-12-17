let cachedAuth = null;
let authExpiry = 0;

async function login() {
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
    throw new Error("FMS login failed");
  }

  const json = await res.json();

  cachedAuth = {
    token: json.data.token,
    thirdPartyToken: json.data.third_party_token
  };

  // conservative TTL (25 min)
  authExpiry = Date.now() + 25 * 60 * 1000;

  return cachedAuth;
}

export async function getAuth() {
  if (cachedAuth && Date.now() < authExpiry) {
    return cachedAuth;
  }
  return await login();
}

export async function fmsFetch(url, options = {}) {
  const auth = await getAuth();

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "fms-client": "FMS_WEB",
      "fms-token": auth.token,
      "authorization": auth.thirdPartyToken,
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FMS API failed: ${res.status} ${text}`);
  }

  return res.json();
}
