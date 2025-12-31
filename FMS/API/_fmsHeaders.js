export function buildHeaders(auth) {
  return {
    "accept": "application/json",
    "content-type": "application/json",
    "fms-client": "FMS_WEB",
    "fms-token": auth.fmsToken,
    "authorization": auth.authToken,
    "company-id": auth.companyId
  };
}