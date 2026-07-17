import { describe, expect, it } from "vitest";
import { extractPlainText } from "./plain";

describe("extractPlainText", () => {
  it("splits markdown by headings and keeps section provenance", () => {
    const md = "# Osmosis\nWater moves.\n\n## Diffusion\nParticles spread.";
    const result = extractPlainText(md, "notes.md");
    expect(result.warning).toBeUndefined();
    expect(result.segments.length).toBe(2);
    expect(result.segments[1].sourceRef).toContain("Section: Diffusion");
  });

  it("flags empty documents instead of inventing content", () => {
    const result = extractPlainText("   \n  ", "empty.txt");
    expect(result.warning).toBeTruthy();
    expect(result.segments).toEqual([]);
  });
});
