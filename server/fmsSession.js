let session = null;
let sessionExpiresAt = 0;

export async function ensureFmsSession() {
  const now = Date.now();

  if (session && now < sessionExpiresAt) {
    return session;
  }

  console.log("Logging into FMS...");

  const res = await fetch("https://fms.item.com/fms-platform-user/Auth/Login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "fms-client": "FMS_WEB"
    },
    body: JSON.stringify({
      account: process.env.FMS_USER,
      password: process.env.FMS_PASS
    })
  });

  const json = await res.json();

  if (!res.ok || !json?.data?.token) {
    throw new Error("FMS login failed");
  }

  session = {
    fmsToken: json.data.token,
    authorization: json.data.third_party_token,
    cookie: res.headers.get("set-cookie") || ""
  };

  // Conservative expiration (55 minutes)
  sessionExpiresAt = now + 55 * 60 * 1000;

  console.log("FMS login successful");

  return session;
}

export function getFmsSession() {
  if (!session) {
    throw new Error("FMS session not initialized");
  }
  return session;
}
