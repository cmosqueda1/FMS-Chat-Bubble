import { fmsFetch } from "./utils/fmsFetch.js";

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    imported: typeof fmsFetch === "function"
  });
}
