import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle } from "@/lib/api";
import {
  characterBibleSchema,
  defaultCharacterBible,
} from "@/lib/characterBible";
import type { Prisma } from "@prisma/client";

export async function GET() {
  return handle(async () => {
    const row = await prisma.characterBible.findFirst({ orderBy: { version: "desc" } });
    const references = await prisma.aadhiReference.findMany({ orderBy: { createdAt: "asc" } });
    return {
      version: row?.version ?? 0,
      data: row ? characterBibleSchema.parse(row.data) : defaultCharacterBible,
      references,
    };
  });
}

/** Saving the bible bumps its version (history preserved). */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const data = characterBibleSchema.parse(await req.json());
    const latest = await prisma.characterBible.findFirst({ orderBy: { version: "desc" } });
    return prisma.characterBible.create({
      data: {
        version: (latest?.version ?? 0) + 1,
        data: data as Prisma.InputJsonValue,
      },
    });
  });
}
