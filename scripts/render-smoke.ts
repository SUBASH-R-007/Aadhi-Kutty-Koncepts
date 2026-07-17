import { writeFileSync } from "fs";
import { mkdirSync } from "fs";
import path from "path";
import { MockImageProvider } from "../src/lib/providers/image/mock";
import { SharpSvgRenderer } from "../src/lib/render/svgRenderer";
import { defaultZones } from "../src/lib/templates";

const run = async () => {
  mkdirSync(".storage", { recursive: true });
  const mock = new MockImageProvider();
  const illustration = await mock.generateIllustration({
    prompt: "photosynthesis chloroplast",
    negativePrompt: "",
    width: 730,
    height: 486,
    referenceImages: [],
  });
  const renderer = new SharpSvgRenderer();
  const png = await renderer.render({
    width: 1920,
    height: 1080,
    backgroundColor: "#FFFFFF",
    illustrationPng: illustration,
    zones: defaultZones(1920, 1080),
    title: "Photosynthesis: turning light into food",
    blocks: [
      {
        heading: "In simple terms",
        body: "Plants capture sunlight with chlorophyll and use it to turn water and carbon dioxide into glucose and oxygen.",
      },
      {
        heading: "Step by step",
        body: "Light reactions split water and make ATP and NADPH; the Calvin cycle then fixes carbon dioxide into sugars.",
      },
    ],
    keyTakeaway: "Light energy becomes chemical energy stored in glucose.",
    exampleActivity: "Explain to a friend why leaves are green using the word chlorophyll.",
    headerText: "Plant Biology · Foundations",
    footerText: "Rajalakshmi Engineering College",
    pageNumber: "1",
    sourceNote: "notes.md — Section: Photosynthesis",
    brand: { primary: "#1F3A5F", accent: "#E8A13D", paper: "#FAF7F2" },
  });
  writeFileSync(".storage/render-smoke.png", png);
  console.log("COMPOSED_OK bytes=", png.length);
};

run().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
