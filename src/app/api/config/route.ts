import { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { appConfigSchema, getAppConfig, updateAppConfig } from "@/lib/config";
import { getEnv } from "@/lib/env";

/** Admin configuration: model names + editable negative constraints. */
export async function GET() {
  return handle(async () => {
    const env = getEnv();
    return {
      config: await getAppConfig(),
      providers: {
        openaiTextAvailable: Boolean(env.OPENAI_API_KEY),
        geminiTextAvailable: Boolean(env.GEMINI_API_KEY),
        openaiImageAvailable: Boolean(env.OPENAI_API_KEY),
      },
    };
  });
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const patch = appConfigSchema.partial().parse(await req.json());
    return updateAppConfig(patch);
  });
}
