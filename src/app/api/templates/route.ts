import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ApiError } from "@/lib/api";
import { getStorage, contentTypeFor } from "@/lib/storage";
import { defaultZones } from "@/lib/templates";
import { zonesSchema } from "@/lib/content/schemas";
import type { Prisma } from "@prisma/client";

const ALLOWED_TEMPLATE_EXT = ["png", "jpg", "jpeg", "svg"];

export async function GET() {
  return handle(async () => prisma.template.findMany({ orderBy: { createdAt: "desc" } }));
}

/**
 * Create a template. multipart/form-data: name, width, height, optional
 * `file` (PNG/JPEG/SVG background; PDF backgrounds are a future adapter).
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const form = await req.formData();
    const meta = z
      .object({
        name: z.string().min(1),
        width: z.coerce.number().int().min(320).max(4096),
        height: z.coerce.number().int().min(320).max(4096),
      })
      .parse({
        name: form.get("name"),
        width: form.get("width"),
        height: form.get("height"),
      });

    let assetKey: string | null = null;
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      if (!ALLOWED_TEMPLATE_EXT.includes(ext)) {
        throw new ApiError(
          400,
          "Template background must be PNG, JPEG, or SVG. (PDF-page backgrounds arrive via a future adapter.)",
        );
      }
      assetKey = `templates/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await getStorage().put(assetKey, Buffer.from(await file.arrayBuffer()), contentTypeFor(file.name));
    }

    const zonesRaw = form.get("zones");
    const zones =
      typeof zonesRaw === "string" && zonesRaw
        ? zonesSchema.parse(JSON.parse(zonesRaw))
        : defaultZones(meta.width, meta.height);

    return prisma.template.create({
      data: {
        name: meta.name,
        version: 1,
        assetKey,
        width: meta.width,
        height: meta.height,
        zones: zones as Prisma.InputJsonValue,
      },
    });
  });
}
