import type { IllustrationRequest, ImageProvider } from "./types";

/**
 * Google Gemini image adapter (generateContent with image output, e.g.
 * gemini-2.5-flash-image / "nano banana"). Approved Aadhi reference images are
 * passed as inline_data parts so the model conditions the mascot on them.
 * Model name comes from admin config/env.
 */
export class GeminiImageProvider implements ImageProvider {
  readonly name = "gemini";
  readonly supportsReferenceImages = true;

  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async generateIllustration(req: IllustrationRequest): Promise<Buffer> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model,
    )}:generateContent`;

    const aspect =
      req.width / req.height > 1.15
        ? "landscape (roughly 3:2)"
        : req.width / req.height < 0.87
          ? "portrait (roughly 2:3)"
          : "square (1:1)";

    const parts: Record<string, unknown>[] = [
      {
        text:
          `${req.prompt}\n\nComposition: ${aspect}.\n` +
          `Hard constraints (must all hold): ${req.negativePrompt}.\n` +
          (req.referenceImages.length > 0
            ? "The attached reference image(s) define the mascot's exact appearance — match them precisely."
            : ""),
      },
    ];
    for (const ref of req.referenceImages) {
      parts.push({
        inline_data: { mime_type: ref.mimeType, data: ref.data.toString("base64") },
      });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });
    if (!res.ok) {
      throw new Error(`Gemini image API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      candidates?: {
        content?: { parts?: { inlineData?: { data?: string }; inline_data?: { data?: string } }[] };
      }[];
    };
    for (const part of data.candidates?.[0]?.content?.parts ?? []) {
      const b64 = part.inlineData?.data ?? part.inline_data?.data;
      if (b64) return Buffer.from(b64, "base64");
    }
    throw new Error("Gemini image API returned no image data");
  }
}
