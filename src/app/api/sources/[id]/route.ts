import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle } from "@/lib/api";
import { updateSourceText } from "@/lib/sources";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({ extractedText: z.string() });

/** PATCH: user-corrected extraction text → re-chunk. */
export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    return updateSourceText(id, body.extractedText);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    await prisma.sourceDocument.delete({ where: { id } });
    return { ok: true };
  });
}
