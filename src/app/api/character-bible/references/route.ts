import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { getStorage, contentTypeFor } from "@/lib/storage";

/** Upload an approved Aadhi reference image (PNG/JPEG). */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Missing file field");
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (!["png", "jpg", "jpeg"].includes(ext)) {
      throw new ApiError(400, "Reference images must be PNG or JPEG.");
    }
    const key = `aadhi-references/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await getStorage().put(key, Buffer.from(await file.arrayBuffer()), contentTypeFor(file.name));
    return prisma.aadhiReference.create({
      data: {
        assetKey: key,
        filename: file.name,
        notes: String(form.get("notes") ?? ""),
      },
    });
  });
}
