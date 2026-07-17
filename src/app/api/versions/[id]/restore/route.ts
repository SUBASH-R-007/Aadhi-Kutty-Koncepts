import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { pageVariantContentSchema } from "@/lib/content/schemas";
import { variantData } from "@/lib/generation/pipeline";
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

/** Restore a page-variant version (creates a new version entry, keeps history). */
export async function POST(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const version = await prisma.pageVariantVersion.findUnique({ where: { id } });
    if (!version) throw new ApiError(404, "Version not found");
    const content = pageVariantContentSchema.parse(version.snapshot);
    return prisma.pageVariant.update({
      where: { id: version.variantId },
      data: {
        ...variantData(content),
        approvedAt: null, // restored content must be re-approved before visuals
        versions: {
          create: {
            snapshot: variantData(content) as Prisma.InputJsonValue,
            note: `Restored version from ${version.createdAt.toISOString()}`,
          },
        },
      },
    });
  });
}
