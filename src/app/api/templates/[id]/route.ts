import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { zonesSchema } from "@/lib/content/schemas";
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  zones: zonesSchema,
  /** When provided, this project is repointed to the new template version. */
  projectId: z.string().optional(),
});

/**
 * Templates are versioned assets: saving zones creates a NEW version row
 * (same name and background) and optionally repoints the given project.
 * Older versions remain untouched for projects still using them.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const current = await prisma.template.findUnique({ where: { id } });
    if (!current) throw new ApiError(404, "Template not found");

    const latest = await prisma.template.aggregate({
      where: { name: current.name },
      _max: { version: true },
    });
    const next = await prisma.template.create({
      data: {
        name: current.name,
        version: (latest._max.version ?? current.version) + 1,
        assetKey: current.assetKey,
        width: current.width,
        height: current.height,
        zones: body.zones as Prisma.InputJsonValue,
      },
    });
    if (body.projectId) {
      await prisma.project.update({
        where: { id: body.projectId },
        data: { templateId: next.id },
      });
    }
    return next;
  });
}
