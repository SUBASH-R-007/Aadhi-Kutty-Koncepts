import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { getQueue } from "@/lib/queue";

type Params = { params: Promise<{ id: string }> };

/** Regenerate this page's content only (novice + advanced), from its own chunks. */
export async function POST(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) throw new ApiError(404, "Page not found");
    const jobId = await getQueue().enqueue("regenerate-page", { pageId: id }, page.projectId);
    return { jobId };
  });
}
