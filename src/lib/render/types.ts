import type { Callout, ContentBlock, KnowledgeCheckItem, Zones } from "@/lib/content/schemas";

export type RenderSpec = {
  width: number;
  height: number;
  backgroundColor: string;
  /** Rasterized template background (PNG/JPEG/SVG bytes), stretched to the page. */
  backgroundImage?: Buffer;
  illustrationPng?: Buffer;
  /** College logo (PNG/JPEG/SVG bytes) drawn into the logo zone. */
  logoImage?: Buffer;
  zones: Zones;
  title: string;
  whyLearn: string;
  blocks: ContentBlock[];
  callouts: Callout[];
  keyTakeaway: string;
  exampleActivity: string;
  knowledgeCheck: KnowledgeCheckItem[];
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
