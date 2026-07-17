import type { IllustrationRequest, ImageProvider } from "./types";

/**
 * OpenAI image adapter. Uses the images/edits endpoint with the Aadhi
 * reference images when available (reference conditioning), otherwise
 * images/generations. Model name comes from admin config/env.
 */
export class OpenAIImageProvider implements ImageProvider {
  readonly name = "openai";
  readonly supportsReferenceImages = true;

  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async generateIllustration(req: IllustrationRequest): Promise<Buffer> {
    const size = nearestSupportedSize(req.width, req.height);
    const prompt = `${req.prompt}\n\nHard constraints (must all hold): ${req.negativePrompt}`;

    let res: Response;
    if (req.referenceImages.length > 0) {
      const form = new FormData();
      form.set("model", this.model);
      form.set("prompt", prompt);
      form.set("size", size);
      for (const [i, ref] of req.referenceImages.entries()) {
        form.append(
          "image[]",
          new Blob([new Uint8Array(ref.data)], { type: ref.mimeType }),
          `reference-${i}.png`,
        );
      }
      res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
      });
    } else {
      res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: this.model, prompt, size }),
      });
    }

    if (!res.ok) {
      throw new Error(`OpenAI image API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI image API returned no image data");
    return Buffer.from(b64, "base64");
  }
}

/** gpt-image-1 accepts a fixed set of sizes; pick the closest aspect. */
function nearestSupportedSize(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 1.15) return "1536x1024";
  if (ratio < 0.87) return "1024x1536";
  return "1024x1024";
}
