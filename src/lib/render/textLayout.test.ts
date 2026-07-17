import { describe, expect, it } from "vitest";
import { estimateOverflow, wrapText } from "./textLayout";

describe("wrapText", () => {
  it("wraps deterministically within the estimated width", () => {
    const lines = wrapText("one two three four five six seven eight", 100, 16);
    expect(lines.length).toBeGreaterThan(1);
    // ~12 chars per line at 100px / (16 * 0.52)
    expect(Math.max(...lines.map((l) => l.length))).toBeLessThanOrEqual(13);
    expect(wrapText("one two three four five six seven eight", 100, 16)).toEqual(lines);
  });

  it("preserves explicit newlines", () => {
    expect(wrapText("a\nb", 500, 16)).toEqual(["a", "b"]);
  });
});

describe("estimateOverflow", () => {
  const zone = { w: 800, h: 400 };
  const base = {
    title: "Photosynthesis",
    keyTakeaway: "",
    exampleActivity: "",
    bodyZonePx: zone,
    titleZonePx: { w: 900, h: 120 },
    bodyFontSize: 20,
    headingFontSize: 26,
    titleFontSize: 48,
  };

  it("passes small content", () => {
    const result = estimateOverflow({
      ...base,
      blocks: [{ heading: "Intro", body: "Short body." }],
    });
    expect(result.overflows).toBe(false);
  });

  it("flags oversized content", () => {
    const result = estimateOverflow({
      ...base,
      blocks: Array.from({ length: 10 }, () => ({
        heading: "Heading",
        body: "A rather long body sentence that keeps going and going. ".repeat(10),
      })),
    });
    expect(result.overflows).toBe(true);
    expect(result.ratio).toBeGreaterThan(1);
  });
});
