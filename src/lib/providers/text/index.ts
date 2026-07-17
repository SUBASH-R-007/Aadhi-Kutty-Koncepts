import { getEnv } from "@/lib/env";
import { getAppConfig } from "@/lib/config";
import type { TextProvider } from "./types";
import { OpenAITextProvider } from "./openai";
import { GeminiTextProvider } from "./gemini";
import { MockTextProvider } from "./mock";

export type { TextProvider, OutlineInput, PageGenInput } from "./types";

/**
 * Resolve the provider a project asked for. Falls back to the mock provider
 * (with a warning string the caller can surface) when the API key is missing.
 */
export async function getTextProvider(
  requested: string,
): Promise<{ provider: TextProvider; warning?: string }> {
  const env = getEnv();
  const config = await getAppConfig();
  if (requested === "openai") {
    if (!env.OPENAI_API_KEY) {
      return {
        provider: new MockTextProvider(),
        warning: "OPENAI_API_KEY is not set — used the mock text provider instead.",
      };
    }
    return { provider: new OpenAITextProvider(env.OPENAI_API_KEY, config.openaiTextModel) };
  }
  if (requested === "gemini") {
    if (!env.GEMINI_API_KEY) {
      return {
        provider: new MockTextProvider(),
        warning: "GEMINI_API_KEY is not set — used the mock text provider instead.",
      };
    }
    return { provider: new GeminiTextProvider(env.GEMINI_API_KEY, config.geminiTextModel) };
  }
  return { provider: new MockTextProvider() };
}
