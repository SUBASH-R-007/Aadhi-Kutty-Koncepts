import type { Zones } from "@/lib/content/schemas";

export const aspectPresets: Record<string, { width: number; height: number; label: string }> = {
  "16:9": { width: 1920, height: 1080, label: "16:9 landscape" },
  "4:3": { width: 1600, height: 1200, label: "4:3" },
  A4: { width: 1240, height: 1754, label: "A4 portrait" },
  "1:1": { width: 1400, height: 1400, label: "Square" },
};

/** Sensible default safe zones per orientation (normalized 0..1). */
export function defaultZones(width: number, height: number): Zones {
  const landscape = width >= height;
  if (landscape) {
    return {
      header: { x: 0.04, y: 0.025, w: 0.8, h: 0.05 },
      logo: { x: 0.88, y: 0.02, w: 0.08, h: 0.08 },
      title: { x: 0.04, y: 0.09, w: 0.92, h: 0.11 },
      body: { x: 0.04, y: 0.23, w: 0.5, h: 0.6 },
      visual: { x: 0.58, y: 0.23, w: 0.38, h: 0.45 },
      aadhi: { x: 0.62, y: 0.66, w: 0.3, h: 0.22 },
      sourceNote: { x: 0.04, y: 0.855, w: 0.7, h: 0.035 },
      footer: { x: 0.04, y: 0.91, w: 0.6, h: 0.05 },
      pageNumber: { x: 0.9, y: 0.91, w: 0.06, h: 0.05 },
    };
  }
  return {
    header: { x: 0.06, y: 0.02, w: 0.7, h: 0.035 },
    logo: { x: 0.82, y: 0.015, w: 0.12, h: 0.05 },
    title: { x: 0.06, y: 0.07, w: 0.88, h: 0.08 },
    visual: { x: 0.14, y: 0.16, w: 0.72, h: 0.28 },
    aadhi: { x: 0.66, y: 0.36, w: 0.26, h: 0.12 },
    body: { x: 0.06, y: 0.47, w: 0.88, h: 0.42 },
    sourceNote: { x: 0.06, y: 0.9, w: 0.7, h: 0.02 },
    footer: { x: 0.06, y: 0.94, w: 0.6, h: 0.03 },
    pageNumber: { x: 0.88, y: 0.94, w: 0.06, h: 0.03 },
  };
}
