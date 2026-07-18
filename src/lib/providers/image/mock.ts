import sharp from "sharp";
import type { IllustrationRequest, ImageProvider } from "./types";

/**
 * Keyless deterministic image provider for demos and tests.
 *
 * It produces a FULLY TRANSPARENT illustration: the real Aadhi is composited
 * separately (from the project's uploaded mascot / reference images) and the
 * template provides the background, so the mock draws nothing of its own — no
 * placeholder scene, no backdrop panel. This keeps mock pages clean: only the
 * template, the typeset text, and the real mascot appear.
 */
export class MockImageProvider implements ImageProvider {
  readonly name = "mock";
  readonly supportsReferenceImages = false;

  async generateIllustration(req: IllustrationRequest): Promise<Buffer> {
    const w = Math.min(Math.max(req.width, 1), 1536);
    const h = Math.min(Math.max(req.height, 1), 1536);
    return sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
  }
}
