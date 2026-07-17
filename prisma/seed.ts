import { PrismaClient } from "@prisma/client";
import { defaultCharacterBible } from "../src/lib/characterBible";
import { emptyCreativeContext } from "../src/lib/creativeContext/schema";

const prisma = new PrismaClient();

/** Seeds the Aadhi character bible (v1) and a default creative context (v1). */
async function main() {
  const bible = await prisma.characterBible.findFirst();
  if (!bible) {
    await prisma.characterBible.create({
      data: { version: 1, data: defaultCharacterBible },
    });
    console.log("Seeded Aadhi Character Bible v1");
  }

  const existing = await prisma.creativeContext.findFirst({
    where: { name: "Studio default" },
  });
  if (!existing) {
    const context = {
      ...emptyCreativeContext("Studio default"),
      visualStyle: {
        description:
          "Flat vector illustration, soft shading, clean outlines, generous whitespace, warm optimistic lighting.",
        medium: "flat vector",
        lighting: "warm, soft",
        compositionRules: [
          "single clear focal concept per page",
          "illustration supports the text, never competes with it",
        ],
        forbiddenStyles: ["photorealism", "3D render", "anime", "grunge", "horror", "meme style"],
      },
      brand: {
        colors: ["#1F3A5F", "#E8A13D", "#FAF7F2"],
        fonts: ["Arial", "Helvetica"],
        logoRules: ["logo stays in its template safe zone; never redrawn by the image model"],
      },
      aadhi: {
        personality: ["warm", "curious", "encouraging"],
        physicalTraits: [
          "anthropomorphic blackbuck",
          "two symmetric spiral horns",
          "white eye-rings, chest, and muzzle markings",
        ],
        clothing: ["navy blazer with college crest", "white shirt", "sand chinos"],
        poseRules: ["points, demonstrates, reacts, or guides — never purely decorative"],
        expressionRules: ["matches the emotional tone of the page"],
        forbiddenChanges: ["no clothing changes", "no horn changes", "no marking changes"],
      },
      pageRules: {
        density: "medium" as const,
        textVisualBalance: "roughly 60% text / 40% visual on content pages",
        recurringElements: ["page number", "source note", "footer with college name"],
        forbiddenElements: ["watermarks", "text drawn inside the generated illustration"],
      },
      approvedPromptFragments: [
        "flat vector educational illustration, soft shading, clean outlines",
        "friendly college-campus atmosphere",
        "single clear focal concept, uncluttered composition",
      ],
      notes: ["Seeded from docs/creative-context.md"],
    };
    await prisma.creativeContext.create({
      data: { name: "Studio default", version: 1, data: context },
    });
    console.log("Seeded Creative Context 'Studio default' v1");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
