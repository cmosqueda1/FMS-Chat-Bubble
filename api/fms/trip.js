export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    env: {
      FMS_BASE_URL: !!process.env.FMS_BASE_URL,
      FMS_ACCOUNT: !!process.env.FMS_ACCOUNT,
      FMS_PASSWORD: !!process.env.FMS_PASSWORD,
      FMS_COMPANY: !!process.env.FMS_COMPANY
    }
  });
}
