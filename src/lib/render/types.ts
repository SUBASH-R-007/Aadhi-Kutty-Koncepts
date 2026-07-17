import type { ContentBlock, Zones } from "@/lib/content/schemas";

export type RenderSpec = {
  width: number;
  height: number;
  backgroundColor: string;
  /** Rasterized template background (PNG/JPEG/SVG bytes), stretched to the page. */
  backgroundImage?: Buffer;
  illustrationPng?: Buffer;
  zones: Zones;
  title: string;
  blocks: ContentBlock[];
  keyTakeaway: string;
  exampleActivity: string;
  headerText: string;
  footerText: string;
  pageNumber: string;
  sourceNote: string;
  brand: { primary: string; accent: string; paper: string };
};

/**
 * Deterministic page composer. Instructional text is typeset here — never by
 * the image model. Implementations: SharpSvgRenderer (default); an HTML +
 * Playwright renderer can be swapped in behind this interface.
 */
export interface PageRenderer {
  render(spec: RenderSpec): Promise<Buffer>; // PNG bytes
}
