import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { getStorage, contentTypeFor } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

/** Upload the Aadhi mascot image (PNG/JPEG/SVG); composited into the template aadhi zone. */
export async function POST(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new ApiError(404, "Project not found");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Missing file field");
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (!["png", "jpg", "jpeg", "svg"].includes(ext)) {
      throw new ApiError(400, "Mascot image must be PNG, JPEG, or SVG.");
    }
    const key = `projects/${id}/mascot-${Date.now()}.${ext}`;
    await getStorage().put(key, Buffer.from(await file.arrayBuffer()), contentTypeFor(file.name));
    return prisma.project.update({ where: { id }, data: { mascotAssetKey: key } });
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const { id } = await params;
    return prisma.project.update({ where: { id }, data: { mascotAssetKey: null } });
  });
}
