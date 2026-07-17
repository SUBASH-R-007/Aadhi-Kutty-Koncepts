/** A contiguous piece of source text with its provenance. */
export type SourceSegment = {
  text: string;
  /** Human-readable provenance, e.g. "notes.pdf p.3", "slides.pptx slide 5", "Section: Osmosis". */
  sourceRef: string;
};

export type ExtractionResult = {
  /** Full extracted text shown to the user for review/correction. */
  text: string;
  segments: SourceSegment[];
  /** Set when the document looks scanned/unreadable — never silently invent content. */
  warning?: string;
};

export type SourceKind = "paste" | "txt" | "md" | "pdf" | "docx" | "pptx";

export function kindFromFilename(filename: string): SourceKind | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "txt") return "txt";
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "pptx") return "pptx";
  return null;
}
