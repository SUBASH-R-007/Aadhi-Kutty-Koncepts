import sharp from "sharp";
import type { IllustrationRequest, ImageProvider } from "./types";

/**
 * Keyless deterministic image provider for demos and tests.
 *
 * It intentionally does NOT draw a mascot or busy shapes: the real Aadhi is
 * composited separately (from the project's uploaded mascot / reference images),
 * so the placeholder is just a soft, on-brand backdrop for it. This keeps mock
 * pages clean — a subtle purple-to-cream wash seeded by the prompt.
 */
export class MockImageProvider implements ImageProvider {
  readonly name = "mock";
  readonly supportsReferenceImages = false;

  async generateIllustration(req: IllustrationRequest): Promise<Buffer> {
    const w = Math.min(req.width, 1536);
    const h = Math.min(req.height, 1536);
    // Small, deterministic hue nudge so regenerations differ subtly, but stay
    // within a soft, brand-adjacent purple range.
    const tint = 260 + (hash(req.prompt) % 40); // 260–300 = violet/purple

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="g" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="hsl(${tint}, 45%, 97%)"/>
      <stop offset="70%" stop-color="hsl(${tint}, 40%, 94%)"/>
      <stop offset="100%" stop-color="hsl(${tint}, 38%, 90%)"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
