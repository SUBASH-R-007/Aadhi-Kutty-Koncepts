import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { getQueue } from "@/lib/queue";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  level: z.enum(["novice", "advanced"]),
  poseOverride: z.string().optional(),
  styleOverride: z.string().optional(),
  extraInstructions: z.string().optional(),
});

/** Generate or regenerate this page's visual (approved variants only). */
export async function POST(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const body = bodySchema.parse(await req.json());
    const page = await prisma.page.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!page) throw new ApiError(404, "Page not found");
    if (page.visualLocked) throw new ApiError(400, "This page's visual is locked.");
    const variant = page.variants.find((v) => v.level === body.level);
    if (!variant?.approvedAt) {
      throw new ApiError(400, "Approve this page in the editor before generating its visual.");
    }
    const jobId = await getQueue().enqueue(
      "generate-visual",
      { pageId: id, ...body },
      page.projectId,
    );
    return { jobId };
  });
}
