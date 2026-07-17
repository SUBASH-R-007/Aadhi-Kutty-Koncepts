import { z } from "zod";

/** Shared runtime-validated shapes for generated educational content. */

export const levelSchema = z.enum(["novice", "advanced"]);
export type Level = z.infer<typeof levelSchema>;

export const contentBlockSchema = z.object({
  heading: z.string().default(""),
  body: z.string(),
});
export type ContentBlock = z.infer<typeof contentBlockSchema>;

export const glossaryEntrySchema = z.object({
  term: z.string(),
  definition: z.string(),
});

/** Callout box, mirroring the illustrated-skills' Pro-Tip / Fun Fact / etc. */
export const calloutTypes = [
  "Pro-Tip",
  "Fun Fact",
  "Wait, Why?",
  "Key Insight",
  "Common Pitfall",
  "Exam Tip",
] as const;
export const calloutSchema = z.object({
  type: z.string().default("Pro-Tip"),
  body: z.string(),
});
export type Callout = z.infer<typeof calloutSchema>;

export const knowledgeCheckSchema = z.object({
  question: z.string(),
  answer: z.string().default(""),
  kind: z
    .enum(["recall", "understanding", "application", "challenge"])
    .default("recall"),
});
export type KnowledgeCheckItem = z.infer<typeof knowledgeCheckSchema>;

export const pageVariantContentSchema = z.object({
  title: z.string().min(1),
  learningObjective: z.string().default(""),
  whyLearn: z.string().default(""),
  blocks: z.array(contentBlockSchema).min(1),
  callouts: z.array(calloutSchema).default([]),
  keyTakeaway: z.string().default(""),
  exampleActivity: z.string().default(""),
  glossary: z.array(glossaryEntrySchema).default([]),
  knowledgeCheck: z.array(knowledgeCheckSchema).default([]),
  sourceRefs: z.array(z.string()).default([]),
  visualBrief: z.string().default(""),
  aadhiRole: z.string().default(""),
  aadhiPose: z.string().default("pointing"),
  aadhiExpression: z.string().default("friendly-smile"),
  aadhiPlacement: z.string().default("beside-visual"),
  insufficientSource: z.boolean().default(false),
});
export type PageVariantContent = z.infer<typeof pageVariantContentSchema>;

export const pageGenResultSchema = z.object({
  novice: pageVariantContentSchema,
  advanced: pageVariantContentSchema,
});
export type PageGenResult = z.infer<typeof pageGenResultSchema>;

export const outlineSchema = z.object({
  pages: z
    .array(
      z.object({
        title: z.string().min(1),
        objective: z.string().default(""),
        chunkIds: z.array(z.string()).default([]),
      }),
    )
    .min(1),
});
export type Outline = z.infer<typeof outlineSchema>;

export const zoneKeys = [
  "title",
  "body",
  "visual",
  "aadhi",
  "logo",
  "header",
  "footer",
  "pageNumber",
  "sourceNote",
] as const;
export type ZoneKey = (typeof zoneKeys)[number];

export const zoneSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.01).max(1),
  h: z.number().min(0.01).max(1),
});
export type Zone = z.infer<typeof zoneSchema>;

export const zonesSchema = z.record(z.enum(zoneKeys), zoneSchema);
export type Zones = Partial<Record<ZoneKey, Zone>>;
