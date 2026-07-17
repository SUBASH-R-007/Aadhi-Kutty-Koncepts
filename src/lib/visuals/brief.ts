import type { CharacterBibleData } from "@/lib/characterBible";
import type { CreativeContextData } from "@/lib/creativeContext/schema";

export type BriefInput = {
  visualBrief: string;
  learningObjective: string;
  level: string;
  tone: string;
  aadhiRole: string;
  aadhiPose: string;
  aadhiExpression: string;
  brandColors: string[];
  collegeName: string;
  imageStyle: string;
  bible: CharacterBibleData;
  creative: CreativeContextData | null;
  negativeConstraints: string[];
  poseOverride?: string;
  styleOverride?: string;
  extraInstructions?: string;
};

/**
 * Builds the illustration prompt from approved page content, the Aadhi
 * character bible, the selected creative context and brand settings.
 * The image model never renders instructional text — the deterministic
 * renderer typesets it afterwards.
 */
export function buildIllustrationBrief(input: BriefInput): {
  prompt: string;
  negativePrompt: string;
} {
  const pose = input.poseOverride || input.aadhiPose || "pointing";
  const style =
    input.styleOverride ||
    input.imageStyle ||
    input.creative?.visualStyle.description ||
    input.bible.illustrationStyle;

  const lines: string[] = [
    `Educational illustration for a college learning page (${input.level} level, tone: ${input.tone}).`,
    `Concept to illustrate: ${input.visualBrief || input.learningObjective}`,
    `Style: ${style}.`,
    `Include the college mascot exactly once: ${input.bible.name}, an ${input.bible.species}.`,
    `Mascot appearance (must match exactly): ${input.bible.markings} ${input.bible.horns} ${input.bible.proportions} ${input.bible.faceAndEyes} Wearing: ${input.bible.clothing}`,
    `Mascot role on this page: ${input.aadhiRole || "guides the learner through the concept"}. Pose: ${pose}. Expression: ${input.aadhiExpression || "friendly-smile"}.`,
    `${input.bible.clearSpaceRules}`,
  ];
  if (input.brandColors.length > 0) {
    lines.push(`Brand palette to harmonize with: ${input.brandColors.join(", ")} (${input.collegeName}).`);
  }
  if (input.creative) {
    if (input.creative.visualStyle.compositionRules.length > 0) {
      lines.push(`Composition rules: ${input.creative.visualStyle.compositionRules.join("; ")}.`);
    }
    if (input.creative.approvedPromptFragments.length > 0) {
      lines.push(input.creative.approvedPromptFragments.join(", "));
    }
  }
  if (input.extraInstructions) {
    lines.push(`Page-specific instructions: ${input.extraInstructions}`);
  }
  lines.push(
    "The illustration must contain NO text, labels, captions, numbers, or logos — all text is typeset separately.",
  );

  const forbidden = [
    ...input.negativeConstraints,
    ...(input.creative?.visualStyle.forbiddenStyles ?? []).map((s) => `no ${s}`),
    ...(input.creative?.pageRules.forbiddenElements ?? []).map((s) => `no ${s}`),
    ...input.bible.forbiddenChanges.map((s) => s.toLowerCase()),
  ];

  return {
    prompt: lines.join("\n"),
    negativePrompt: Array.from(new Set(forbidden)).join("; "),
  };
}
