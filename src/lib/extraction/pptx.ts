import JSZip from "jszip";
import type { ExtractionResult, SourceSegment } from "./types";

/** PPTX extraction: reads slide XML and keeps "file.pptx slide N" provenance. */
export async function extractPptx(
  buffer: Buffer,
  label: string,
): Promise<ExtractionResult> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort(
      (a, b) =>
        parseInt(a.match(/slide(\d+)/)![1], 10) -
        parseInt(b.match(/slide(\d+)/)![1], 10),
    );

  const segments: SourceSegment[] = [];
  for (const file of slideFiles) {
    const xml = await zip.files[file].async("string");
    const slideNo = file.match(/slide(\d+)/)![1];
    // Paragraph-level grouping: <a:p> blocks; runs are <a:t> text elements.
    const paragraphs = Array.from(xml.matchAll(/<a:p[ >][\s\S]*?<\/a:p>/g)).map(
      (m) =>
        Array.from(m[0].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g))
          .map((t) => decodeXml(t[1]))
          .join(""),
    );
    const text = paragraphs.filter((p) => p.trim()).join("\n").trim();
    if (text) segments.push({ text, sourceRef: `${label} slide ${slideNo}` });
  }

  const warning =
    segments.length === 0
      ? "No text could be extracted from this PPTX (slides may be image-only)."
      : undefined;

  return {
    text: segments.map((s) => `[${s.sourceRef}]\n${s.text}`).join("\n\n"),
    segments,
    warning,
  };
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
