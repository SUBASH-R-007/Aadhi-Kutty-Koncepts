/**
 * Deterministic text layout shared by the server-side page renderer and the
 * client-side overflow warning. Pure functions, no dependencies.
 */

export const AVG_CHAR_WIDTH_RATIO = 0.52; // average glyph width / font size for Arial-class fonts
export const LINE_HEIGHT_RATIO = 1.35;

/** Greedy word wrap using an average-glyph-width estimate. */
export function wrapText(text: string, maxWidthPx: number, fontSizePx: number): string[] {
  const charsPerLine = Math.max(4, Math.floor(maxWidthPx / (fontSizePx * AVG_CHAR_WIDTH_RATIO)));
  const lines: string[] = [];
  for (const rawLine of text.split(/\n/)) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (line && line.length + 1 + word.length > charsPerLine) {
        lines.push(line);
        line = word.length > charsPerLine ? word.slice(0, charsPerLine - 1) + "…" : word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export function linesHeightPx(lineCount: number, fontSizePx: number): number {
  return lineCount * fontSizePx * LINE_HEIGHT_RATIO;
}

export type OverflowInput = {
  title: string;
  whyLearn?: string;
  blocks: { heading?: string; body: string }[];
  callouts?: { type: string; body: string }[];
  keyTakeaway: string;
  exampleActivity: string;
  knowledgeCheck?: { question: string }[];
  /** Pixel size of the body safe zone. */
  bodyZonePx: { w: number; h: number };
  titleZonePx: { w: number; h: number };
  bodyFontSize: number;
  headingFontSize: number;
  titleFontSize: number;
};

export type OverflowResult = {
  overflows: boolean;
  usedPx: number;
  availablePx: number;
  ratio: number;
};

/** Estimate whether the page text fits its template zones. */
export function estimateOverflow(input: OverflowInput): OverflowResult {
  let used = 0;
  const gap = input.bodyFontSize * 0.9;
  const bodyLines = (text: string) =>
    linesHeightPx(wrapText(text, input.bodyZonePx.w, input.bodyFontSize).length, input.bodyFontSize);

  if (input.whyLearn?.trim()) used += bodyLines(input.whyLearn) + gap;
  for (const block of input.blocks) {
    if (block.heading?.trim()) {
      used += linesHeightPx(
        wrapText(block.heading, input.bodyZonePx.w, input.headingFontSize).length,
        input.headingFontSize,
      );
    }
    if (block.body.trim()) used += bodyLines(block.body);
    used += gap;
  }
  for (const callout of input.callouts ?? []) {
    if (callout.body.trim()) used += bodyLines(callout.body) + input.bodyFontSize * 1.6 + gap;
  }
  for (const extra of [input.keyTakeaway, input.exampleActivity]) {
    if (extra.trim()) used += bodyLines(extra) + gap;
  }
  for (const item of input.knowledgeCheck ?? []) {
    if (item.question.trim()) used += bodyLines(item.question) + gap * 0.6;
  }
  const titleUsed = linesHeightPx(
    wrapText(input.title, input.titleZonePx.w, input.titleFontSize).length,
    input.titleFontSize,
  );
  const titleOver = titleUsed > input.titleZonePx.h;
  return {
    overflows: used > input.bodyZonePx.h || titleOver,
    usedPx: Math.round(used),
    availablePx: Math.round(input.bodyZonePx.h),
    ratio: input.bodyZonePx.h > 0 ? used / input.bodyZonePx.h : 1,
  };
}
