import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        variants: {
          include: { versions: { orderBy: { createdAt: "desc" }, take: 20 } },
        },
        visuals: { orderBy: { version: "desc" } },
      },
    });
    if (!page) throw new ApiError(404, "Page not found");
    return page;
  });
}

const patchSchema = z.object({
  visualLocked: z.boolean().optional(),
  activeVisualId: z.string().nullable().optional(),
});

/** Lock/unlock the page visual or restore a previous visual version. */
export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    if (body.activeVisualId) {
      const visual = await prisma.pageVisual.findUnique({ where: { id: body.activeVisualId } });
      if (!visual || visual.pageId !== id) throw new ApiError(400, "Visual does not belong to this page");
    }
    return prisma.page.update({ where: { id }, data: body });
  });
}
