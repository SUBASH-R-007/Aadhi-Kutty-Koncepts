import { z } from "zod";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { defaultNegativeConstraints } from "@/lib/characterBible";

/**
 * Admin-editable runtime configuration. Environment variables provide the
 * defaults; rows in AppConfig override them (Settings page). Model names are
 * never hardcoded at call sites — providers read them from here.
 */
export const appConfigSchema = z.object({
  openaiTextModel: z.string(),
  geminiTextModel: z.string(),
  openaiImageModel: z.string(),
  geminiImageModel: z.string(),
  negativeConstraints: z.array(z.string()),
});
export type AppConfigData = z.infer<typeof appConfigSchema>;

const CONFIG_KEY = "app";

export async function getAppConfig(): Promise<AppConfigData> {
  const env = getEnv();
  const defaults: AppConfigData = {
    openaiTextModel: env.OPENAI_TEXT_MODEL,
    geminiTextModel: env.GEMINI_TEXT_MODEL,
    openaiImageModel: env.OPENAI_IMAGE_MODEL,
    geminiImageModel: env.GEMINI_IMAGE_MODEL,
    negativeConstraints: defaultNegativeConstraints,
  };
  const row = await prisma.appConfig.findUnique({ where: { key: CONFIG_KEY } });
  if (!row) return defaults;
  const parsed = appConfigSchema.partial().safeParse(row.value);
  if (!parsed.success) return defaults;
  return { ...defaults, ...parsed.data };
}

export async function updateAppConfig(
  patch: Partial<AppConfigData>,
): Promise<AppConfigData> {
  const current = await getAppConfig();
  const next = appConfigSchema.parse({ ...current, ...patch });
  await prisma.appConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: next },
    update: { value: next },
  });
  return next;
}
