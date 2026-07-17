import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { ingestSource } from "@/lib/sources";
import { kindFromFilename } from "@/lib/extraction";

type Params = { params: Promise<{ id: string }> };

const pasteSchema = z.object({
  text: z.string().min(1),
  label: z.string().default("Pasted text"),
});

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * POST multipart/form-data with a `file` field (TXT/MD/PDF/DOCX/PPTX), or
 * JSON `{text, label}` for pasted material.
 */
export async function POST(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new ApiError(404, "Project not found");

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new ApiError(400, "Missing file field");
      if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(400, "File exceeds 25 MB limit");
      const kind = kindFromFilename(file.name);
      if (!kind) {
        throw new ApiError(400, "Unsupported file type. Use TXT, Markdown, PDF, DOCX, or PPTX.");
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      return ingestSource(id, { kind, filename: file.name, buffer });
    }

    const body = pasteSchema.parse(await req.json());
    return ingestSource(id, {
      kind: "paste",
      filename: body.label,
      buffer: Buffer.from(body.text, "utf-8"),
    });
  });
}
