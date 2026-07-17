import type { ExtractionResult, SourceSegment } from "./types";

/**
 * Plain text / Markdown extraction. Markdown headings become section
 * boundaries so chunk references can point at "Section: <heading>".
 */
export function extractPlainText(text: string, label: string): ExtractionResult {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return {
      text: "",
      segments: [],
      warning: "The document contains no extractable text.",
    };
  }
  const lines = normalized.split("\n");
  const segments: SourceSegment[] = [];
  let currentRef = label;
  let buffer: string[] = [];

  const flush = () => {
    const t = buffer.join("\n").trim();
    if (t) segments.push({ text: t, sourceRef: currentRef });
    buffer = [];
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flush();
      currentRef = `${label} — Section: ${heading[1].trim()}`;
    }
    buffer.push(line);
  }
  flush();

  return { text: normalized, segments: segments.length ? segments : [{ text: normalized, sourceRef: label }] };
}
