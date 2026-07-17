import { getEnv } from "@/lib/env";
import { getAppConfig } from "@/lib/config";
import type { ImageProvider } from "./types";
import { OpenAIImageProvider } from "./openai";
import { MockImageProvider } from "./mock";

export type { ImageProvider, IllustrationRequest, ReferenceImage } from "./types";

export async function getImageProvider(
  requested: string,
): Promise<{ provider: ImageProvider; warning?: string }> {
  const env = getEnv();
  const config = await getAppConfig();
  if (requested === "openai") {
    if (!env.OPENAI_API_KEY) {
      return {
        provider: new MockImageProvider(),
        warning: "OPENAI_API_KEY is not set — used the mock image provider instead.",
      };
    }
    return { provider: new OpenAIImageProvider(env.OPENAI_API_KEY, config.openaiImageModel) };
  }
  return { provider: new MockImageProvider() };
}
