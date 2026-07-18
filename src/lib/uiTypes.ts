import type { ContentBlock, Zones } from "@/lib/content/schemas";

/** JSON shapes returned by the API, as consumed by client components. */

export type ProjectListItem = {
  id: string;
  name: string;
  subject: string;
  status: string;
  updatedAt: string;
  _count: { pages: number; sources: number };
};

export type SourceChunkDto = {
  id: string;
  index: number;
  text: string;
  sourceRef: string;
  charCount: number;
};

export type SourceDto = {
  id: string;
  filename: string;
  kind: string;
  status: string;
  warning: string | null;
  extractedText: string;
  chunks: SourceChunkDto[];
};

export type VariantVersionDto = {
  id: string;
  note: string;
  createdAt: string;
};

export type CalloutDto = { type: string; body: string };
export type KnowledgeCheckDto = { question: string; answer: string; kind: string };

export type VariantDto = {
  id: string;
  level: "novice" | "advanced";
  title: string;
  learningObjective: string;
  whyLearn: string;
  blocks: ContentBlock[];
  callouts: CalloutDto[];
  keyTakeaway: string;
  exampleActivity: string;
  glossary: { term: string; definition: string }[];
  knowledgeCheck: KnowledgeCheckDto[];
  sourceRefs: string[];
  visualBrief: string;
  aadhiRole: string;
  aadhiPose: string;
  aadhiExpression: string;
  aadhiPlacement: string;
  insufficientSource: boolean;
  approvedAt: string | null;
  versions?: VariantVersionDto[];
};

export type VisualDto = {
  id: string;
  version: number;
  level: string;
  status: string;
  prompt: string;
  illustrationAssetKey: string | null;
  composedAssetKey: string | null;
  createdAt: string;
};

export type PageDto = {
  id: string;
  index: number;
  visualLocked: boolean;
  activeVisualId: string | null;
  variants: VariantDto[];
  visuals: VisualDto[];
};

export type TemplateDto = {
  id: string;
  name: string;
  version: number;
  assetKey: string | null;
  width: number;
  height: number;
  zones: Zones;
};

export type CreativeContextDto = {
  id: string;
  name: string;
  version: number;
  data: unknown;
  createdAt: string;
};

export type ProjectDto = {
  id: string;
  name: string;
  subject: string;
  audience: string;
  learningGoals: string;
  tone: string;
  targetPageCount: number;
  aspectRatio: string;
  pageWidth: number;
  pageHeight: number;
  collegeName: string;
  logoAssetKey: string | null;
  mascotAssetKey: string | null;
  brandColors: string[];
  textProvider: string;
  imageProvider: string;
  imageStyle: string;
  status: string;
  templateId: string | null;
  template: TemplateDto | null;
  creativeContextId: string | null;
  creativeContext: CreativeContextDto | null;
  sources: SourceDto[];
  pages: PageDto[];
  exports: ExportArtifactDto[];
};

export type ExportArtifactDto = {
  id: string;
  levels: string;
  format: string;
  assetKey: string;
  createdAt: string;
};

export type JobDto = {
  id: string;
  type: string;
  status: "queued" | "running" | "complete" | "failed";
  progress: number;
  message: string;
  error: string | null;
  result: { warning?: string } | null;
};

export function assetUrl(key: string): string {
  return `/api/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
}
