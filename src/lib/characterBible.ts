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
    "Warm, curious, encouraging, slightly playful but never distracting; a patient peer-tutor who points, demonstrates, reacts and celebrates learner progress.",
  clothing:
    "College uniform: navy blazer with college crest on the left breast pocket, white shirt, sand-colored chinos, no shoes (hooves).",
  colorPalette: [
    "#2B1D16",
    "#171003",
    "#FAF7F2",
    "#1F3A5F",
    "#FFFFFF",
    "#D9C7A0",
    "#E8A13D",
  ],
  proportions:
    "Bipedal, about 5 heads tall, slim athletic build, digitigrade legs with neat black hooves, four fingers plus thumb per hand.",
  horns:
    "Two long spiral (helical) horns, perfectly symmetric, 2.5 twists, dark charcoal, rising in a shallow V. Never asymmetric, broken, or more than two.",
  faceAndEyes:
    "Large friendly almond eyes, dark irises with a single white highlight, small dark nose, gentle smile by default.",
  markings:
    "Dark brown-black upper body; white underside, chest and inner limbs; white eye-rings, white muzzle patch, white chin. Identical on every page.",
  illustrationStyle:
    "Flat vector illustration with soft shading, clean consistent outlines, minimal gradients, friendly rounded shapes. No photorealism, no 3D render, no anime.",
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
    "safety goggles (lab pages only)",
    "graduation cap (celebration pages only)",
  ],
  forbiddenChanges: [
    "No clothing changes outside the character bible",
    "No horn shape, count, or symmetry changes",
    "No changes to facial or body markings",
    "No species drift (no deer, goat, or generic antelope look)",
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
