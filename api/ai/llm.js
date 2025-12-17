import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp";
import { ensureModel } from "./ensureModel.js";

let session;

export async function getLLMSession() {
  if (session) return session;

  const modelPath = await ensureModel();

  const model = new LlamaModel({
    modelPath,
    contextSize: 4096
  });

  const context = new LlamaContext({ model });
  session = new LlamaChatSession({ context });

  return session;
}
