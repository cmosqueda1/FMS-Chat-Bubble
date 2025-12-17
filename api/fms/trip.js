export default function handler(req, res) {
  async function fmsFetchMock() {
    return { ok: true };
  }

  res.status(200).json({
    ok: true,
    inlineFunctionWorks: typeof fmsFetchMock === "function"
  });
}
