import { describe, expect, it } from "vitest";
import { buildIllustrationBrief } from "./brief";
import { defaultCharacterBible, defaultNegativeConstraints } from "@/lib/characterBible";

describe("buildIllustrationBrief", () => {
  const base = {
    visualBrief: "A chloroplast absorbing sunlight",
    learningObjective: "Explain the light reactions",
    level: "novice",
    tone: "friendly",
    aadhiRole: "points at the chloroplast",
    aadhiPose: "pointing",
    aadhiExpression: "curious",
    brandColors: ["#1F3A5F", "#E8A13D"],
    collegeName: "Rajalakshmi Engineering College",
    imageStyle: "",
    bible: defaultCharacterBible,
    creative: null,
    negativeConstraints: defaultNegativeConstraints,
  };

  it("embeds the character bible canon and forbids in-image text", () => {
    const { prompt, negativePrompt } = buildIllustrationBrief(base);
    expect(prompt).toContain("blackbuck");
    expect(prompt).toContain("spiral");
    expect(prompt).toMatch(/NO text/i);
    expect(negativePrompt).toContain("no extra horns");
    expect(negativePrompt).toContain("no watermarks");
  });

  it("applies pose and style overrides", () => {
    const { prompt } = buildIllustrationBrief({
      ...base,
      poseOverride: "celebrating",
      styleOverride: "chalkboard sketch style",
    });
    expect(prompt).toContain("Pose: celebrating");
    expect(prompt).toContain("chalkboard sketch style");
  });
});
