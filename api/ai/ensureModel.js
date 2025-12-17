import fs from "fs";
import path from "path";
import https from "https";
import { execFile } from "child_process";

const MODELS_DIR = path.resolve(process.cwd(), "models");
const MODEL_FILE = "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf";
const MODEL_PATH = path.join(MODELS_DIR, MODEL_FILE);

// Direct asset URL (stable)
const MODEL_URL =
  "https://github.com/cmosqueda1/FMS-Chat-Bubble/releases/download/models-v1/" +
  MODEL_FILE;

export async function ensureModel() {
  if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });
  if (fs.existsSync(MODEL_PATH)) return MODEL_PATH;

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(MODEL_PATH);
    https.get(MODEL_URL, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", err => {
      fs.unlink(MODEL_PATH, () => reject(err));
    });
  });

  return MODEL_PATH;
}
