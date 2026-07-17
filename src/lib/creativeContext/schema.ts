import { z } from "zod";

/** Structured record extracted from imported prior-chat text or briefs. */
export const creativeContextSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().positive().default(1),
  visualStyle: z.object({
    description: z.string().default(""),
    medium: z.string().optional(),
    lighting: z.string().optional(),
    compositionRules: z.array(z.string()).default([]),
    forbiddenStyles: z.array(z.string()).default([]),
  }),
  brand: z.object({
    collegeName: z.string().optional(),
    colors: z.array(z.string()).default([]),
    fonts: z.array(z.string()).default([]),
    logoRules: z.array(z.string()).default([]),
  }),
  aadhi: z.object({
    personality: z.array(z.string()).default([]),
    physicalTraits: z.array(z.string()).default([]),
    clothing: z.array(z.string()).default([]),
    poseRules: z.array(z.string()).default([]),
    expressionRules: z.array(z.string()).default([]),
    forbiddenChanges: z.array(z.string()).default([]),
  }),
  pageRules: z.object({
    density: z.enum(["low", "medium", "high"]).default("medium"),
    textVisualBalance: z.string().default(""),
    recurringElements: z.array(z.string()).default([]),
    forbiddenElements: z.array(z.string()).default([]),
  }),
  approvedPromptFragments: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
});

export type CreativeContextData = z.infer<typeof creativeContextSchema>;

export const emptyCreativeContext = (name: string): CreativeContextData => ({
  name,
  version: 1,
  visualStyle: {
    description: "",
    compositionRules: [],
    forbiddenStyles: [],
  },
  brand: { colors: [], fonts: [], logoRules: [] },
  aadhi: {
    personality: [],
    physicalTraits: [],
    clothing: [],
    poseRules: [],
    expressionRules: [],
    forbiddenChanges: [],
  },
  pageRules: {
    density: "medium",
    textVisualBalance: "",
    recurringElements: [],
    forbiddenElements: [],
  },
  approvedPromptFragments: [],
  notes: [],
});
