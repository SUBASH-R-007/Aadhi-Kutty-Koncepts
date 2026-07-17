import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { pageVariantContentSchema, levelSchema } from "@/lib/content/schemas";
import { variantData } from "@/lib/generation/pipeline";
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string; level: string }> };

const saveSchema = z.object({
  content: pageVariantContentSchema,
  /** Approving marks the variant ready for visual generation. */
  approve: z.boolean().default(false),
  note: z.string().default("Edited"),
});

/** Save (and optionally approve) a page variant; every save is versioned. */
export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id, level: levelRaw } = await params;
    const level = levelSchema.parse(levelRaw);
    const body = saveSchema.parse(await req.json());
    const existing = await prisma.pageVariant.findUnique({
      where: { pageId_level: { pageId: id, level } },
    });
    if (!existing) throw new ApiError(404, "Variant not found");

    return prisma.pageVariant.update({
      where: { pageId_level: { pageId: id, level } },
      data: {
        ...variantData(body.content),
        approvedAt: body.approve ? new Date() : existing.approvedAt,
        versions: {
          create: {
            snapshot: variantData(body.content) as Prisma.InputJsonValue,
            note: body.approve ? `${body.note} + approved` : body.note,
          },
        },
      },
      include: { versions: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
  });
}
