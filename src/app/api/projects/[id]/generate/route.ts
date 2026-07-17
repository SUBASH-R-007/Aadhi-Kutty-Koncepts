import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { getQueue } from "@/lib/queue";

type Params = { params: Promise<{ id: string }> };

/** Kick off page-by-page novice + advanced content generation. */
export async function POST(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { sources: { include: { _count: { select: { chunks: true } } } } },
    });
    if (!project) throw new ApiError(404, "Project not found");
    const usable = project.sources.filter(
      (s) => s.status !== "unreadable" && s._count.chunks > 0,
    );
    if (usable.length === 0) {
      throw new ApiError(400, "Upload at least one readable source document first.");
    }
    const jobId = await getQueue().enqueue("generate-content", { projectId: id }, id);
    return { jobId };
  });
}
