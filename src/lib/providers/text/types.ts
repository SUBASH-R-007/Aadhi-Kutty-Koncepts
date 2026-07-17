import type {
  Outline,
  PageGenResult,
} from "@/lib/content/schemas";
import type { CreativeContextData } from "@/lib/creativeContext/schema";

export type ProjectBrief = {
  subject: string;
  audience: string;
  learningGoals: string;
  tone: string;
  targetPageCount: number;
};

export type ChunkPreview = { id: string; sourceRef: string; preview: string };
export type ChunkFull = { id: string; sourceRef: string; text: string };

export type OutlineInput = {
  project: ProjectBrief;
  chunks: ChunkPreview[];
};

export type PageGenInput = {
  project: ProjectBrief;
  pageTitle: string;
  pageObjective: string;
  pageIndex: number;
  totalPages: number;
  chunks: ChunkFull[];
  /** The only source refs the model is allowed to cite. */
  allowedSourceRefs: string[];
};

/**
 * Task-level text provider interface. Implementations: OpenAI, Gemini, Mock.
 * Keeping the interface at task level (not raw chat) lets the mock provider
 * produce deterministic structured output for keyless demos and tests.
 */
export interface TextProvider {
  readonly name: string;
  outline(input: OutlineInput): Promise<Outline>;
  generatePage(input: PageGenInput): Promise<PageGenResult>;
  extractCreativeContext(raw: string, name: string): Promise<CreativeContextData>;
}
