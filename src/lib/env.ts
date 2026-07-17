import { z } from "zod";

/**
 * Server-side environment configuration, validated once at startup.
 * API keys and model names live here (or in AppConfig DB overrides) — they are
 * never imported into client components.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default(".storage"),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_REGION: z.string().optional().default("us-east-1"),
  S3_BUCKET: z.string().optional().default(""),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  OPENAI_TEXT_MODEL: z.string().default("gpt-4o-mini"),
  GEMINI_TEXT_MODEL: z.string().default("gemini-2.0-flash"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-2.5-flash-image"),
  QUEUE_DRIVER: z.enum(["inprocess"]).default("inprocess"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment configuration: ${parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
