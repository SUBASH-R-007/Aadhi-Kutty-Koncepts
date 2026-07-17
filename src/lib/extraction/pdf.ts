import { PDFParse } from "pdf-parse";
import type { ExtractionResult, SourceSegment } from "./types";

/** PDF extraction with per-page provenance ("file.pdf p.N"). */
export async function extractPdf(
  buffer: Buffer,
  label: string,
): Promise<ExtractionResult> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();

    const segments: SourceSegment[] = result.pages
      .map((page) => ({
        text: page.text.trim(),
        sourceRef: `${label} p.${page.num}`,
      }))
      .filter((s) => s.text.length > 0);

    const totalChars = segments.reduce((n, s) => n + s.text.length, 0);
    const warning =
      totalChars < Math.max(40, result.total * 10)
        ? "This PDF appears to be scanned or contains no extractable text. Content generation would have nothing real to work from — please provide a text-based file or paste the material."
        : undefined;

    return {
      text: segments.map((s) => `[${s.sourceRef}]\n${s.text}`).join("\n\n"),
      segments,
      warning,
    };
  } finally {
    await parser.destroy();
  }
}
