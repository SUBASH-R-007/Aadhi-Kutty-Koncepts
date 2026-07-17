import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  audience: z.string().optional(),
  learningGoals: z.string().optional(),
  tone: z.string().optional(),
  targetPageCount: z.number().int().min(1).max(60).optional(),
  collegeName: z.string().optional(),
  brandColors: z.array(z.string()).optional(),
  textProvider: z.enum(["openai", "gemini", "mock"]).optional(),
  imageProvider: z.enum(["openai", "mock"]).optional(),
  imageStyle: z.string().optional(),
  templateId: z.string().nullable().optional(),
  creativeContextId: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        template: true,
        creativeContext: true,
        sources: { include: { chunks: { orderBy: { index: "asc" } } }, orderBy: { createdAt: "asc" } },
        pages: {
          orderBy: { index: "asc" },
          include: {
            variants: true,
            visuals: { orderBy: { version: "desc" } },
          },
        },
        exports: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!project) throw new ApiError(404, "Project not found");
    return project;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    return prisma.project.update({ where: { id }, data: body });
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return { ok: true };
  });
}
