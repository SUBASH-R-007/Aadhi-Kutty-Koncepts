import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle } from "@/lib/api";
import { aspectPresets } from "@/lib/templates";

const createProjectSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  audience: z.string().min(1),
  learningGoals: z.string().default(""),
  tone: z.string().default("friendly and encouraging"),
  targetPageCount: z.number().int().min(1).max(60).default(8),
  aspectRatio: z.string().default("16:9"),
  pageWidth: z.number().int().min(320).max(4096).optional(),
  pageHeight: z.number().int().min(320).max(4096).optional(),
  collegeName: z.string().min(1),
  brandColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(6).default([]),
  textProvider: z.enum(["openai", "gemini", "mock"]).default("mock"),
  imageProvider: z.enum(["openai", "gemini", "mock"]).default("mock"),
  imageStyle: z.string().default(""),
});

export async function GET() {
  return handle(async () =>
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { pages: true, sources: true } } },
    }),
  );
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = createProjectSchema.parse(await req.json());
    const preset = aspectPresets[body.aspectRatio];
    const width = body.pageWidth ?? preset?.width ?? 1920;
    const height = body.pageHeight ?? preset?.height ?? 1080;
    return prisma.project.create({
      data: { ...body, pageWidth: width, pageHeight: height },
    });
  });
}
