import { describe, expect, it } from "vitest";
import { MockTextProvider } from "./mock";
import { outlineSchema, pageGenResultSchema } from "@/lib/content/schemas";
import { creativeContextSchema } from "@/lib/creativeContext/schema";

const project = {
  subject: "Plant Biology",
  audience: "First-year students",
  learningGoals: "Understand photosynthesis",
  tone: "friendly",
  targetPageCount: 3,
};

describe("MockTextProvider", () => {
  const provider = new MockTextProvider();

  it("produces a schema-valid outline covering all chunks", async () => {
    const chunks = Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`,
      sourceRef: `notes.pdf p.${i + 1}`,
      preview: `Chunk ${i} preview about photosynthesis stages`,
    }));
    const outline = await provider.outline({ project, chunks });
    expect(() => outlineSchema.parse(outline)).not.toThrow();
    const assigned = outline.pages.flatMap((p) => p.chunkIds);
    expect(new Set(assigned).size).toBe(6);
    expect(outline.pages.length).toBeLessThanOrEqual(project.targetPageCount);
  });

  it("produces schema-valid novice + advanced variants with real source refs", async () => {
    const result = await provider.generatePage({
      project,
      pageTitle: "Light reactions",
      pageObjective: "Explain the light reactions",
      pageIndex: 0,
      totalPages: 3,
      chunks: [
        {
          id: "c1",
          sourceRef: "notes.pdf p.1",
          text: "Photosynthesis converts light energy into chemical energy. Chlorophyll absorbs photons. The Calvin cycle fixes carbon dioxide into sugars over many steps.",
        },
      ],
      allowedSourceRefs: ["notes.pdf p.1"],
    });
    expect(() => pageGenResultSchema.parse(result)).not.toThrow();
    expect(result.novice.sourceRefs).toEqual(["notes.pdf p.1"]);
    expect(result.advanced.sourceRefs).toEqual(["notes.pdf p.1"]);
    expect(result.novice.insufficientSource).toBe(false);

    // Illustrated-skills structure: novice = basic tier, advanced = deeper tier.
    expect(result.novice.whyLearn).not.toBe("");
    expect(result.novice.callouts.length).toBeGreaterThan(0);
    expect(result.novice.callouts.map((c) => c.type)).toContain("Fun Fact");
    expect(result.novice.knowledgeCheck.length).toBeGreaterThanOrEqual(3);
    expect(result.novice.knowledgeCheck.every((q) => q.kind === "recall" || q.kind === "understanding")).toBe(true);

    expect(result.advanced.callouts.map((c) => c.type)).toContain("Key Insight");
    expect(result.advanced.knowledgeCheck.some((q) => q.kind === "challenge")).toBe(true);
  });

  it("flags insufficient source material instead of inventing content", async () => {
    const result = await provider.generatePage({
      project,
      pageTitle: "Empty page",
      pageObjective: "",
      pageIndex: 0,
      totalPages: 1,
      chunks: [{ id: "c1", sourceRef: "s.txt", text: "Too short." }],
      allowedSourceRefs: ["s.txt"],
    });
    expect(result.novice.insufficientSource).toBe(true);
    expect(result.advanced.insufficientSource).toBe(true);
  });

  it("extracts a schema-valid creative context with brand colors", async () => {
    const raw = `Style: flat vector illustration\n- Primary color #1F3A5F\n- no photorealism style please\n- Aadhi is friendly and curious mascot`;
    const ctx = await provider.extractCreativeContext(raw, "Imported");
    expect(() => creativeContextSchema.parse(ctx)).not.toThrow();
    expect(ctx.brand.colors).toContain("#1F3A5F");
    expect(ctx.name).toBe("Imported");
  });
});
