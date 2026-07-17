import mammoth from "mammoth";
import type { ExtractionResult, SourceSegment } from "./types";

// mammoth ships convertToMarkdown at runtime but omits it from its typings.
const convertToMarkdown = (
  mammoth as unknown as {
    convertToMarkdown(input: { buffer: Buffer }): Promise<{ value: string }>;
  }
).convertToMarkdown.bind(mammoth);

/**
 * DOCX extraction via mammoth. Headings (as markdown #) become section
 * boundaries so provenance reads "file.docx — Section: <heading>".
 */
export async function extractDocx(
  buffer: Buffer,
  label: string,
): Promise<ExtractionResult> {
  const { value } = await convertToMarkdown({ buffer });
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return {
      text: "",
      segments: [],
      warning:
        "No text could be extracted from this DOCX (it may contain only images).",
    };
  }
  const segments: SourceSegment[] = [];
  let currentRef = label;
  let buffer2: string[] = [];
  const flush = () => {
    const t = buffer2.join("\n").trim();
    if (t) segments.push({ text: t, sourceRef: currentRef });
    buffer2 = [];
  };
  for (const line of normalized.split("\n")) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flush();
      currentRef = `${label} — Section: ${heading[1].replace(/[*_`]/g, "").trim()}`;
    }
    buffer2.push(line);
  }
  flush();
  return {
    text: normalized,
    segments: segments.length ? segments : [{ text: normalized, sourceRef: label }],
  };
}
