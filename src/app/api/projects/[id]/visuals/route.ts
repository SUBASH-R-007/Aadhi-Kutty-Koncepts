import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { getQueue } from "@/lib/queue";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ level: z.enum(["novice", "advanced"]) });

/** Generate visuals for every approved, unlocked page in the project. */
export async function POST(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const body = bodySchema.parse(await req.json());
    const pages = await prisma.page.findMany({
      where: { projectId: id },
      include: { variants: true },
      orderBy: { index: "asc" },
    });
    const eligible = pages.filter(
      (p) => !p.visualLocked && p.variants.find((v) => v.level === body.level)?.approvedAt,
    );
    if (eligible.length === 0) {
      throw new ApiError(400, "No approved, unlocked pages. Approve pages in the editor first.");
    }
    const queue = getQueue();
    const jobIds: string[] = [];
    for (const page of eligible) {
      jobIds.push(
        await queue.enqueue("generate-visual", { pageId: page.id, level: body.level }, id),
      );
    }
    return { jobIds, skipped: pages.length - eligible.length };
  });
}
