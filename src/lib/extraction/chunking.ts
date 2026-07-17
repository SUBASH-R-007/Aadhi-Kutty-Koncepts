import type { SourceSegment } from "./types";

export type Chunk = {
  text: string;
  sourceRef: string;
  charCount: number;
};

const TARGET = 1800; // ~450 tokens per chunk
const MIN_MERGE = 400;

/**
 * Split segments into retrieval-sized chunks on paragraph boundaries while
 * preserving each chunk's provenance. Small neighboring pieces from the same
 * source location are merged so chunks stay meaningful.
 */
export function chunkSegments(segments: SourceSegment[]): Chunk[] {
  const chunks: Chunk[] = [];

  for (const segment of segments) {
    const paragraphs = segment.text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    let buffer = "";
    const flush = () => {
      const text = buffer.trim();
      if (text) chunks.push({ text, sourceRef: segment.sourceRef, charCount: text.length });
      buffer = "";
    };

    for (const para of paragraphs) {
      if (para.length > TARGET) {
        flush();
        // Hard-split very long paragraphs on sentence boundaries.
        let piece = "";
        for (const sentence of para.split(/(?<=[.!?])\s+/)) {
          if (piece.length + sentence.length > TARGET && piece) {
            chunks.push({ text: piece.trim(), sourceRef: segment.sourceRef, charCount: piece.trim().length });
            piece = "";
          }
          piece += `${sentence} `;
        }
        buffer = piece;
        continue;
      }
      if (buffer.length + para.length > TARGET) flush();
      buffer += `${para}\n\n`;
    }
    flush();
  }

  // Merge tiny trailing chunks into their predecessor when provenance matches.
  const merged: Chunk[] = [];
  for (const chunk of chunks) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.sourceRef === chunk.sourceRef &&
      chunk.charCount < MIN_MERGE &&
      prev.charCount + chunk.charCount <= TARGET * 1.3
    ) {
      prev.text = `${prev.text}\n\n${chunk.text}`;
      prev.charCount = prev.text.length;
    } else {
      merged.push({ ...chunk });
    }
  }
  return merged;
}
