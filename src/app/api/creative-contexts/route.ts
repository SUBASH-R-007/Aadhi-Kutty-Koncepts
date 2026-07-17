import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle } from "@/lib/api";
import { creativeContextSchema } from "@/lib/creativeContext/schema";
import { getTextProvider } from "@/lib/providers/text";
import type { Prisma } from "@prisma/client";

export async function GET() {
  return handle(async () =>
    prisma.creativeContext.findMany({ orderBy: [{ name: "asc" }, { version: "desc" }] }),
  );
}

const extractSchema = z.object({
  action: z.literal("extract"),
  raw: z.string().min(1),
  name: z.string().min(1),
  provider: z.enum(["openai", "gemini", "mock"]).default("mock"),
});

const saveSchema = z.object({
  action: z.literal("save"),
  data: creativeContextSchema,
});

/**
 * Creative Context import — the explicit, safe replacement for "read our
 * previous chats": users paste or upload exported conversation text, review
 * the extracted rules, then save. Saving creates a new immutable version.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = z.union([extractSchema, saveSchema]).parse(await req.json());

    if (body.action === "extract") {
      const { provider, warning } = await getTextProvider(body.provider);
      const draft = await provider.extractCreativeContext(
        body.raw.slice(0, 60_000),
        body.name,
      );
      return { draft, warning: warning ?? null, provider: provider.name };
    }

    const latest = await prisma.creativeContext.aggregate({
      where: { name: body.data.name },
      _max: { version: true },
    });
    const version = (latest._max.version ?? 0) + 1;
    return prisma.creativeContext.create({
      data: {
        name: body.data.name,
        version,
        data: { ...body.data, version } as Prisma.InputJsonValue,
      },
    });
  });
}
