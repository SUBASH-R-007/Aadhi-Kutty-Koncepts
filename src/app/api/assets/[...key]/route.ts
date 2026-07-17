import { NextRequest, NextResponse } from "next/server";
import { getStorage, contentTypeFor } from "@/lib/storage";

type Params = { params: Promise<{ key: string[] }> };

/** Serve stored assets (uploads, generated illustrations, composed pages, exports). */
export async function GET(_req: NextRequest, { params }: Params) {
  const { key } = await params;
  const storageKey = key.map(decodeURIComponent).join("/");
  try {
    const data = await getStorage().get(storageKey);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentTypeFor(storageKey),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
