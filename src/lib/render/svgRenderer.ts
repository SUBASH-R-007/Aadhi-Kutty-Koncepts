import sharp from "sharp";
import type { Zone } from "@/lib/content/schemas";
import { wrapText, linesHeightPx, LINE_HEIGHT_RATIO } from "./textLayout";
import type { PageRenderer, RenderSpec } from "./types";

const FONT = "Arial, Helvetica, sans-serif";

/**
 * Deterministic SVG + Sharp compositor. Builds one SVG (typography, cards,
 * page furniture) over the template background and the generated
 * illustration, then rasterizes to PNG.
 */
export class SharpSvgRenderer implements PageRenderer {
  async render(spec: RenderSpec): Promise<Buffer> {
    const { width: W, height: H } = spec;
    const px = (zone: Zone) => ({
      x: zone.x * W,
      y: zone.y * H,
      w: zone.w * W,
      h: zone.h * H,
    });

    const parts: string[] = [];
    parts.push(`<rect width="${W}" height="${H}" fill="${esc(spec.brand.paper)}"/>`);
    if (spec.backgroundImage) {
      const bg = await sharp(spec.backgroundImage).resize(W, H, { fit: "fill" }).png().toBuffer();
      parts.push(img(bg, 0, 0, W, H));
    }

    if (spec.illustrationPng && spec.zones.visual) {
      const z = px(spec.zones.visual);
      const fitted = await sharp(spec.illustrationPng)
        .resize(Math.round(z.w), Math.round(z.h), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      parts.push(img(fitted, z.x, z.y, z.w, z.h));
    }

    const base = Math.min(W, H);
    const sizes = {
      header: base * 0.02,
      title: base * 0.05,
      heading: base * 0.026,
      body: base * 0.021,
      small: base * 0.016,
    };

    if (spec.headerText && spec.zones.header) {
      const z = px(spec.zones.header);
      parts.push(text(spec.headerText, z.x, z.y + sizes.header, sizes.header, spec.brand.primary, "600"));
      parts.push(`<rect x="${z.x}" y="${z.y + z.h}" width="${z.w}" height="2" fill="${esc(spec.brand.accent)}"/>`);
    }

    if (spec.zones.title) {
      const z = px(spec.zones.title);
      let size = sizes.title;
      let lines = wrapText(spec.title, z.w, size);
      while (linesHeightPx(lines.length, size) > z.h && size > sizes.heading) {
        size *= 0.9;
        lines = wrapText(spec.title, z.w, size);
      }
      parts.push(multiline(lines, z.x, z.y + size, size, spec.brand.primary, "700"));
    }

    if (spec.zones.body) {
      const z = px(spec.zones.body);
      parts.push(bodyColumn(spec, z, sizes.heading, sizes.body));
    }

    if (spec.sourceNote && spec.zones.sourceNote) {
      const z = px(spec.zones.sourceNote);
      const lines = wrapText(`Sources: ${spec.sourceNote}`, z.w, sizes.small).slice(0, 2);
      parts.push(multiline(lines, z.x, z.y + sizes.small, sizes.small, "#666666", "400", "italic"));
    }
    if (spec.footerText && spec.zones.footer) {
      const z = px(spec.zones.footer);
      parts.push(text(spec.footerText, z.x, z.y + sizes.small * 1.2, sizes.small * 1.1, spec.brand.primary, "600"));
    }
    if (spec.pageNumber && spec.zones.pageNumber) {
      const z = px(spec.zones.pageNumber);
      parts.push(
        `<text x="${z.x + z.w}" y="${z.y + sizes.small * 1.2}" text-anchor="end" font-family="${FONT}" font-size="${sizes.small * 1.1}" font-weight="600" fill="${esc(spec.brand.primary)}">${esc(spec.pageNumber)}</text>`,
      );
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("\n")}</svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
}

/** Typeset blocks + takeaway + activity inside the body zone, shrinking to fit. */
function bodyColumn(
  spec: RenderSpec,
  z: { x: number; y: number; w: number; h: number },
  headingSize0: number,
  bodySize0: number,
): string {
  for (let scale = 1; scale >= 0.55; scale *= 0.92) {
    const headingSize = headingSize0 * scale;
    const bodySize = bodySize0 * scale;
    const gap = bodySize * 0.9;
    const out: string[] = [];
    let y = z.y;
    let fits = true;

    const emit = (str: string, size: number, color: string, weight: string, extraPad = 0) => {
      const lines = wrapText(str, z.w - extraPad * 2, size);
      const height = linesHeightPx(lines.length, size);
      if (y + height > z.y + z.h) {
        fits = false;
        return;
      }
      out.push(multiline(lines, z.x + extraPad, y + size, size, color, weight));
      y += height + gap * 0.5;
    };

    for (const block of spec.blocks) {
      if (block.heading?.trim()) emit(block.heading, headingSize, spec.brand.primary, "700");
      if (!fits) break;
      if (block.body.trim()) emit(block.body, bodySize, "#222222", "400");
      if (!fits) break;
      y += gap * 0.4;
    }
    if (fits && spec.keyTakeaway.trim()) {
      const lines = wrapText(`★ Key takeaway: ${spec.keyTakeaway}`, z.w - bodySize * 2, bodySize);
      const cardH = linesHeightPx(lines.length, bodySize) + bodySize * 1.2;
      if (y + cardH <= z.y + z.h) {
        out.push(
          `<rect x="${z.x}" y="${y}" width="${z.w}" height="${cardH}" rx="${bodySize * 0.6}" fill="${esc(spec.brand.accent)}" opacity="0.18"/>`,
        );
        out.push(multiline(lines, z.x + bodySize, y + bodySize * 1.4, bodySize, spec.brand.primary, "600"));
        y += cardH + gap * 0.6;
      } else fits = false;
    }
    if (fits && spec.exampleActivity.trim()) {
      emit(`Try it: ${spec.exampleActivity}`, bodySize, "#333333", "400", bodySize * 0.2);
    }
    if (fits) return out.join("\n");
  }
  // Last resort: render at the smallest scale and let the tail clip inside the zone.
  return `<text x="${z.x}" y="${z.y + bodySize0}" font-family="${FONT}" font-size="${bodySize0 * 0.55}" fill="#222222">${esc(spec.blocks[0]?.body.slice(0, 200) ?? "")}</text>`;
}

function img(buffer: Buffer, x: number, y: number, w: number, h: number): string {
  return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${buffer.toString("base64")}" preserveAspectRatio="xMidYMid meet"/>`;
}

function text(str: string, x: number, y: number, size: number, color: string, weight = "400", style = "normal"): string {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" font-style="${style}" fill="${esc(color)}">${esc(str)}</text>`;
}

function multiline(lines: string[], x: number, y: number, size: number, color: string, weight = "400", style = "normal"): string {
  const spans = lines
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : size * LINE_HEIGHT_RATIO}">${esc(line)}</tspan>`)
    .join("");
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" font-style="${style}" fill="${esc(color)}">${spans}</text>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
