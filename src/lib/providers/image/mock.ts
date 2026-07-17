import sharp from "sharp";
import type { IllustrationRequest, ImageProvider } from "./types";

/**
 * Keyless deterministic image provider for demos and tests. Draws a flat
 * vector-style placeholder scene (with a simple Aadhi silhouette) seeded by
 * the prompt, so regenerations visibly differ while staying reproducible.
 */
export class MockImageProvider implements ImageProvider {
  readonly name = "mock";
  readonly supportsReferenceImages = false;

  async generateIllustration(req: IllustrationRequest): Promise<Buffer> {
    const seed = hash(req.prompt);
    const hue = seed % 360;
    const w = Math.min(req.width, 1536);
    const h = Math.min(req.height, 1536);
    const shapes = Array.from({ length: 5 }, (_, i) => {
      const s = hash(`${req.prompt}:${i}`);
      const cx = 8 + (s % 70);
      const cy = 12 + ((s >> 3) % 60);
      const r = 6 + ((s >> 6) % 14);
      return `<circle cx="${cx}%" cy="${cy}%" r="${r}%" fill="hsl(${(hue + i * 40) % 360},55%,${60 + (i % 3) * 8}%)" opacity="0.85"/>`;
    }).join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="hsl(${hue},35%,92%)"/>
  ${shapes}
  <!-- simple Aadhi silhouette: body, head, two symmetric spiral-ish horns -->
  <g transform="translate(${w * 0.68},${h * 0.42}) scale(${(h / 1000) * 1.4})">
    <ellipse cx="0" cy="190" rx="70" ry="110" fill="#2B1D16"/>
    <ellipse cx="0" cy="215" rx="42" ry="75" fill="#FAF7F2"/>
    <rect x="-62" y="120" width="124" height="90" rx="30" fill="#1F3A5F"/>
    <circle cx="0" cy="40" r="58" fill="#2B1D16"/>
    <ellipse cx="0" cy="62" rx="26" ry="20" fill="#FAF7F2"/>
    <circle cx="-22" cy="30" r="12" fill="#FAF7F2"/>
    <circle cx="22" cy="30" r="12" fill="#FAF7F2"/>
    <circle cx="-22" cy="30" r="6" fill="#171003"/>
    <circle cx="22" cy="30" r="6" fill="#171003"/>
    <path d="M -28 -10 C -46 -60 -30 -110 -44 -150 C -30 -120 -14 -70 -20 -12 Z" fill="#171003"/>
    <path d="M 28 -10 C 46 -60 30 -110 44 -150 C 30 -120 14 -70 20 -12 Z" fill="#171003"/>
  </g>
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
