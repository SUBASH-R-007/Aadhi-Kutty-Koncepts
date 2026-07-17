import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { getQueue } from "@/lib/queue";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ levels: z.enum(["novice", "advanced", "both"]) });

export async function POST(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const body = bodySchema.parse(await req.json());
    const pageCount = await prisma.page.count({ where: { projectId: id } });
    if (pageCount === 0) throw new ApiError(400, "Generate content before exporting.");
    const jobId = await getQueue().enqueue("export", { projectId: id, levels: body.levels }, id);
    return { jobId };
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    return prisma.exportArtifact.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });
  });
}
