import type { PageRenderer } from "./types";
import { SharpSvgRenderer } from "./svgRenderer";

export type { PageRenderer, RenderSpec } from "./types";

export function getRenderer(): PageRenderer {
  return new SharpSvgRenderer();
}
