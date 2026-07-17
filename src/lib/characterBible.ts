import { z } from "zod";

export const characterBibleSchema = z.object({
  name: z.string().default("Aadhi"),
  species: z.string().default("anthropomorphic blackbuck"),
  personality: z.string(),
  clothing: z.string(),
  colorPalette: z.array(z.string()),
  proportions: z.string(),
  horns: z.string(),
  faceAndEyes: z.string(),
  markings: z.string(),
  illustrationStyle: z.string(),
  commonPoses: z.array(z.string()),
  commonExpressions: z.array(z.string()),
  approvedAccessories: z.array(z.string()),
  forbiddenChanges: z.array(z.string()),
  clearSpaceRules: z.string(),
});

export type CharacterBibleData = z.infer<typeof characterBibleSchema>;

/** Seed canon — mirrors docs/aadhi-character-bible.md. Editable in Settings. */
export const defaultCharacterBible: CharacterBibleData = {
  name: "Aadhi",
  species: "anthropomorphic blackbuck (Antilope cervicapra)",
  personality:
    "Warm, curious, encouraging, sporty and slightly playful but never distracting; a patient peer-tutor who points, demonstrates, reacts and celebrates learner progress.",
  clothing:
    "Rajalakshmi Engineering College varsity kit: purple letterman/varsity jacket with gold trim and ribbed cuffs, a gold torch-'R' college emblem on the left chest, matching purple track/jogger pants, and purple-and-gold sneakers. Sporty purple goggles/glasses resting on the brow.",
  colorPalette: [
    "#5A277F",
    "#7A3FA0",
    "#F4A81D",
    "#A9744F",
    "#6B4226",
    "#F3E4CE",
    "#FAF7F2",
  ],
  proportions:
    "Bipedal, about 5 heads tall, slim athletic build, digitigrade legs with neat dark hooves, four fingers plus thumb per hand.",
  horns:
    "Two long ridged, gently spiraled blackbuck horns, symmetric, angled back in a shallow V, warm grey-brown. Never asymmetric, broken, or more than two.",
  faceAndEyes:
    "Large friendly almond eyes with dark irises and a single white highlight, small dark nose, gentle smile by default; sporty purple goggles sit on the brow.",
  markings:
    "Warm tan-brown coat; cream muzzle, inner ears, chest and brow; slightly darker brown around the eyes; white chin. Markings are identical on every page.",
  illustrationStyle:
    "Friendly, approachable 3D Pixar-style character render with soft lighting and clean shapes (or a matching flat-vector treatment for diagram pages). Consistent look across pages. No photorealism of a real animal, no anime, no gritty style.",
  commonPoses: [
    "pointing",
    "presenting-with-open-palm",
    "thinking",
    "celebrating",
    "reading-a-book",
    "holding-a-diagram",
    "thumbs-up",
    "walking-and-explaining",
    "waving",
  ],
  commonExpressions: [
    "friendly-smile",
    "curious",
    "surprised",
    "focused",
    "proud",
    "encouraging",
  ],
  approvedAccessories: [
    "college satchel",
    "pointer stick",
    "tablet",
    "sporty purple goggles/glasses",
    "safety goggles (lab pages only)",
    "graduation cap (celebration pages only)",
  ],
  forbiddenChanges: [
    "No clothing changes outside the character bible (always the purple-and-gold varsity kit)",
    "No horn shape, count, or symmetry changes",
    "No changes to facial or body markings",
    "No species drift (no deer, goat, or generic antelope look)",
    "No color changes to the purple jacket or gold trim",
    "No violent, romantic, or off-brand contexts",
  ],
  clearSpaceRules:
    "Keep clear space of at least half of Aadhi's head height around him; never cover instructional text, the college logo, or key diagram elements; do not crop head or horns unless the composition explicitly requires it.",
};

/** Editable in Settings; appended to every image request as hard constraints. */
export const defaultNegativeConstraints: string[] = [
  "no extra limbs",
  "no extra horns",
  "no asymmetric or deformed horns",
  "no inconsistent facial markings",
  "no text, letters, words, numbers, or captions inside the image",
  "no watermarks",
  "no duplicate mascot — exactly one Aadhi",
  "no distorted hands or hooves",
  "no clothing changes outside the approved character bible",
  "no cropped head or horns",
];
