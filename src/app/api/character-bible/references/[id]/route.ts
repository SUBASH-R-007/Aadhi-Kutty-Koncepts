import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { getStorage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const row = await prisma.aadhiReference.findUnique({ where: { id } });
    if (!row) throw new ApiError(404, "Reference not found");
    await getStorage().delete(row.assetKey);
    await prisma.aadhiReference.delete({ where: { id } });
    return { ok: true };
  });
}
