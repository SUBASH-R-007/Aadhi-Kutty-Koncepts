import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const job = await prisma.generationJob.findUnique({ where: { id } });
    if (!job) throw new ApiError(404, "Job not found");
    return job;
  });
}
