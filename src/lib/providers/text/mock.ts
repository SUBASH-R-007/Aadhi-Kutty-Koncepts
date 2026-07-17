import type { Outline, PageGenResult, PageVariantContent } from "@/lib/content/schemas";
import {
  creativeContextSchema,
  emptyCreativeContext,
  type CreativeContextData,
} from "@/lib/creativeContext/schema";
import type { OutlineInput, PageGenInput, TextProvider } from "./types";

/**
 * Deterministic keyless provider: builds structured pages directly from the
 * source chunks. Used for local demos, tests, and CI — no API key required.
 */
export class MockTextProvider implements TextProvider {
  readonly name = "mock";

  async outline(input: OutlineInput): Promise<Outline> {
    const count = Math.max(1, Math.min(input.project.targetPageCount, input.chunks.length || 1));
    const perPage = Math.ceil(Math.max(input.chunks.length, 1) / count);
    const pages = Array.from({ length: count }, (_, i) => {
      const chunks = input.chunks.slice(i * perPage, (i + 1) * perPage);
      const first = chunks[0];
      return {
        title: first ? titleFrom(first.preview, `Part ${i + 1}`) : `Part ${i + 1}`,
        objective: `Understand: ${first ? titleFrom(first.preview, input.project.subject) : input.project.subject}`,
        chunkIds: chunks.map((c) => c.id),
      };
    }).filter((p) => p.chunkIds.length > 0 || input.chunks.length === 0);
    return { pages: pages.length ? pages : [{ title: input.project.subject, objective: "", chunkIds: [] }] };
  }

  async generatePage(input: PageGenInput): Promise<PageGenResult> {
    const joined = input.chunks.map((c) => c.text).join("\n\n");
    const sentences = joined
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
    const insufficient = joined.trim().length < 40;
    const refs = input.allowedSourceRefs;
    const terms = pickTerms(joined);

    const base = {
      title: input.pageTitle,
      learningObjective: input.pageObjective || `Understand ${input.pageTitle}`,
      sourceRefs: refs,
      visualBrief: `A single clear illustration of "${input.pageTitle}" for ${input.project.audience}; no text inside the image.`,
      aadhiRole: "Guides the learner by pointing at the core concept",
      aadhiPose: "pointing",
      aadhiExpression: "friendly-smile",
      aadhiPlacement: "beside-visual",
      insufficientSource: insufficient,
    };

    const novice: PageVariantContent = {
      ...base,
      blocks: insufficient
        ? [{ heading: "Not enough source material", body: "The uploaded source does not contain enough information for this page. Please add more material." }]
        : [
            { heading: "In simple terms", body: simplify(sentences.slice(0, 3).join(" ")) },
            { heading: "Step by step", body: sentences.slice(3, 6).join(" ") || sentences.slice(0, 3).join(" ") },
          ],
      keyTakeaway: insufficient ? "More source material is needed." : `The key idea: ${sentences[0] ?? input.pageTitle}`,
      exampleActivity: insufficient
        ? ""
        : `Try explaining "${input.pageTitle}" to a friend in one sentence, the way you would describe a daily-life situation.`,
      glossary: terms.slice(0, 3).map((t) => ({ term: t, definition: `"${t}" as used in the source material for this page.` })),
    };

    const advanced: PageVariantContent = {
      ...base,
      aadhiPose: "holding-a-diagram",
      aadhiExpression: "focused",
      blocks: insufficient
        ? [{ heading: "Insufficient source", body: "The provided source chunks do not support an advanced treatment of this topic." }]
        : [
            { heading: "Mechanism and detail", body: sentences.slice(0, 5).join(" ") },
            { heading: "Tradeoffs and caveats", body: sentences.slice(5, 9).join(" ") || "The source offers limited discussion of tradeoffs; treat edge cases with care." },
          ],
      keyTakeaway: insufficient ? "More source material is needed." : `Critical insight: ${sentences[1] ?? sentences[0] ?? input.pageTitle}`,
      exampleActivity: insufficient ? "" : `Analyze how "${input.pageTitle}" behaves in an edge case described in the source, and justify your reasoning.`,
      glossary: terms.slice(0, 4).map((t) => ({ term: t, definition: `Domain usage of "${t}" per the source material.` })),
    };

    return { novice, advanced };
  }

  async extractCreativeContext(raw: string, name: string): Promise<CreativeContextData> {
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const colors = Array.from(new Set(raw.match(/#[0-9a-fA-F]{6}\b/g) ?? []));
    const bullets = lines
      .filter((l) => /^[-*•]\s+/.test(l))
      .map((l) => l.replace(/^[-*•]\s+/, ""))
      .slice(0, 20);
    return creativeContextSchema.parse({
      ...emptyCreativeContext(name),
      visualStyle: {
        description: lines.find((l) => /style|illustration|vector|flat/i.test(l)) ?? "",
        compositionRules: bullets.filter((b) => /compos|layout|focal|whitespace/i.test(b)),
        forbiddenStyles: bullets.filter((b) => /no |avoid|never/i.test(b) && /style|photo|3d|anime/i.test(b)),
      },
      brand: { colors, fonts: [], logoRules: [] },
      aadhi: {
        personality: bullets.filter((b) => /aadhi|mascot/i.test(b) && /friendly|warm|curious|playful/i.test(b)),
        physicalTraits: bullets.filter((b) => /horn|marking|blackbuck|coat|hoof|hooves/i.test(b)),
        clothing: bullets.filter((b) => /blazer|uniform|shirt|chinos|clothing/i.test(b)),
        poseRules: [],
        expressionRules: [],
        forbiddenChanges: bullets.filter((b) => /no |never/i.test(b) && /horn|clothing|marking/i.test(b)),
      },
      approvedPromptFragments: bullets.filter((b) => /"/.test(b)).slice(0, 5),
      notes: [`Heuristic extraction (mock provider) from ${lines.length} lines; review before saving.`],
    });
  }
}

function titleFrom(text: string, fallback: string): string {
  const firstLine = text.split(/\r?\n/)[0]?.trim() ?? "";
  const words = firstLine.replace(/[#>*`]/g, "").trim().split(/\s+/).slice(0, 7).join(" ");
  return words.length > 3 ? words : fallback;
}

function simplify(text: string): string {
  return text.length > 400 ? `${text.slice(0, 400)}…` : text;
}

function pickTerms(text: string): string[] {
  const words = text.match(/\b[A-Z][a-z]{4,}\b/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 6);
}
