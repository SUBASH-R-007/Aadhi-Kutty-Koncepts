import { describe, expect, it } from "vitest";
import { chunkSegments } from "./chunking";

describe("chunkSegments", () => {
  it("keeps provenance on every chunk", () => {
    const chunks = chunkSegments([
      { text: "Alpha paragraph.\n\nBeta paragraph.", sourceRef: "notes.pdf p.1" },
      { text: "Gamma paragraph.", sourceRef: "notes.pdf p.2" },
    ]);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((c) => c.sourceRef.startsWith("notes.pdf"))).toBe(true);
    expect(chunks.find((c) => c.text.includes("Gamma"))?.sourceRef).toBe("notes.pdf p.2");
  });

  it("splits long content into bounded chunks", () => {
    const para = "This is a sentence about biology. ".repeat(30); // ~1000 chars
    const chunks = chunkSegments([
      { text: `${para}\n\n${para}\n\n${para}\n\n${para}`, sourceRef: "doc.md — Section: Cells" },
    ]);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.charCount).toBeLessThanOrEqual(1800 * 1.3);
      expect(chunk.sourceRef).toBe("doc.md — Section: Cells");
    }
  });

  it("hard-splits a single huge paragraph on sentence boundaries", () => {
    const huge = "A fact about osmosis stated plainly. ".repeat(200);
    const chunks = chunkSegments([{ text: huge, sourceRef: "big.txt" }]);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((c) => c.charCount <= 2400)).toBe(true);
  });

  it("merges tiny neighbors with the same provenance", () => {
    const chunks = chunkSegments([
      { text: "Tiny one.\n\nTiny two.\n\nTiny three.", sourceRef: "s.txt" },
    ]);
    expect(chunks.length).toBe(1);
  });
});
