import { extractPlainText } from "./plain";
import { extractPdf } from "./pdf";
import { extractDocx } from "./docx";
import { extractPptx } from "./pptx";
import type { ExtractionResult, SourceKind } from "./types";

export type { ExtractionResult, SourceKind, SourceSegment } from "./types";
export { kindFromFilename } from "./types";
export { extractPlainText } from "./plain";

export async function extractDocument(
  kind: SourceKind,
  buffer: Buffer,
  label: string,
): Promise<ExtractionResult> {
  switch (kind) {
    case "paste":
    case "txt":
    case "md":
      return extractPlainText(buffer.toString("utf-8"), label);
    case "pdf":
      return extractPdf(buffer, label);
    case "docx":
      return extractDocx(buffer, label);
    case "pptx":
      return extractPptx(buffer, label);
  }
}
