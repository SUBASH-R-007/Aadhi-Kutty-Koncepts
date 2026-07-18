import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { getImageProvider } from "@/lib/providers/image";
import { getRenderer, type RenderSpec } from "@/lib/render";
import { getAppConfig } from "@/lib/config";
import { characterBibleSchema, defaultCharacterBible } from "@/lib/characterBible";
import { creativeContextSchema } from "@/lib/creativeContext/schema";
import {
  zonesSchema,
  type Callout,
  type ContentBlock,
  type KnowledgeCheckItem,
  type Zones,
} from "@/lib/content/schemas";
import { defaultZones } from "@/lib/templates";
import { buildIllustrationBrief } from "./brief";
import type { JobContext } from "@/lib/queue/types";
import type { PageVariant, Project, Template } from "@prisma/client";

export type GenerateVisualPayload = {
  pageId: string;
  level: "novice" | "advanced";
  poseOverride?: string;
  styleOverride?: string;
  extraInstructions?: string;
};

function parseZones(template: Template | null, width: number, height: number): Zones {
  if (template) {
    const parsed = zonesSchema.safeParse(template.zones);
    if (parsed.success) return parsed.data;
  }
  return defaultZones(width, height);
}

async function loadCharacterBible() {
  const row = await prisma.characterBible.findFirst({ orderBy: { version: "desc" } });
  if (row) {
    const parsed = characterBibleSchema.safeParse(row.data);
    if (parsed.success) return parsed.data;
  }
  return defaultCharacterBible;
}

/**
 * Full per-page visual pipeline:
 *  1. illustration via the image provider (with Aadhi reference conditioning),
 *  2. deterministic typesetting of the approved text,
 *  3. composition over the template into an export-quality PNG,
 * stored as a new PageVisual version.
 */
export async function generatePageVisual(
  payload: GenerateVisualPayload,
  ctx: JobContext,
): Promise<{
  visualId: string;
  warning?: string;
  provider: string;
  referencesAttached: number;
  referencesAvailable: number;
}> {
  const page = await prisma.page.findUniqueOrThrow({
    where: { id: payload.pageId },
    include: { project: { include: { template: true, creativeContext: true } }, variants: true },
  });
  const variant = page.variants.find((v) => v.level === payload.level);
  if (!variant) throw new Error(`Page has no ${payload.level} variant`);
  if (!variant.approvedAt) {
    throw new Error("This page variant has not been approved yet. Save/approve it in the editor first.");
  }
  if (page.visualLocked) {
    throw new Error("This page's visual is locked. Unlock it before regenerating.");
  }

  const project = page.project;
  const storage = getStorage();
  const config = await getAppConfig();
  const bible = await loadCharacterBible();
  const creative = project.creativeContext
    ? creativeContextSchema.safeParse(project.creativeContext.data).data ?? null
    : null;

  const zones = parseZones(project.template, project.pageWidth, project.pageHeight);
  const visualZone = zones.visual ?? { x: 0.55, y: 0.2, w: 0.4, h: 0.5 };

  await ctx.progress(10, `Generating illustration for page ${page.index + 1}`);
  const { provider, warning } = await getImageProvider(project.imageProvider);
  const brief = buildIllustrationBrief({
    visualBrief: variant.visualBrief,
    learningObjective: variant.learningObjective,
    level: payload.level,
    tone: project.tone,
    aadhiRole: variant.aadhiRole,
    aadhiPose: variant.aadhiPose,
    aadhiExpression: variant.aadhiExpression,
    brandColors: (project.brandColors as string[]) ?? [],
    collegeName: project.collegeName,
    imageStyle: project.imageStyle,
    bible,
    creative,
    negativeConstraints: config.negativeConstraints,
    poseOverride: payload.poseOverride,
    styleOverride: payload.styleOverride,
    extraInstructions: payload.extraInstructions,
  });

  const approvedReferenceCount = await prisma.aadhiReference.count();
  const references = provider.supportsReferenceImages
    ? await loadAadhiReferences()
    : [];
  const referenceNote =
    references.length > 0
      ? `${references.length} Aadhi reference image(s) attached to the ${provider.name} request`
      : provider.supportsReferenceImages
        ? `no Aadhi reference images uploaded — none attached`
        : `${approvedReferenceCount} Aadhi reference(s) available, but the ${provider.name} provider does not use reference images (set an OpenAI/Gemini key to send them)`;
  await ctx.progress(
    15,
    `Illustrating page ${page.index + 1} via ${provider.name} — ${referenceNote}`,
  );
  const illustration = await provider.generateIllustration({
    prompt: brief.prompt,
    negativePrompt: brief.negativePrompt,
    width: Math.round(visualZone.w * project.pageWidth),
    height: Math.round(visualZone.h * project.pageHeight),
    referenceImages: references,
  });

  const version =
    ((await prisma.pageVisual.aggregate({
      where: { pageId: page.id },
      _max: { version: true },
    }))._max.version ?? 0) + 1;

  const illustrationKey = `projects/${project.id}/pages/${page.id}/illustration-v${version}.png`;
  await storage.put(illustrationKey, illustration, "image/png");

  await ctx.progress(60, `Composing final page ${page.index + 1}`);
  const composed = await composePage(project, project.template, variant, page.index, illustration);
  const composedKey = `projects/${project.id}/pages/${page.id}/composed-v${version}-${payload.level}.png`;
  await storage.put(composedKey, composed, "image/png");

  const visual = await prisma.pageVisual.create({
    data: {
      pageId: page.id,
      version,
      level: payload.level,
      prompt: brief.prompt,
      illustrationAssetKey: illustrationKey,
      composedAssetKey: composedKey,
      status: "complete",
    },
  });
  await prisma.page.update({
    where: { id: page.id },
    data: { activeVisualId: visual.id },
  });
  return {
    visualId: visual.id,
    warning,
    provider: provider.name,
    referencesAttached: references.length,
    referencesAvailable: approvedReferenceCount,
  };
}

async function loadAadhiReferences() {
  const storage = getStorage();
  const rows = await prisma.aadhiReference.findMany({ orderBy: { createdAt: "asc" }, take: 4 });
  const refs = [];
  for (const row of rows) {
    try {
      refs.push({ data: await storage.get(row.assetKey), mimeType: "image/png" });
    } catch {
      // missing file — skip silently, generation still works without references
    }
  }
  return refs;
}

/** Deterministic composition of a page (with or without an illustration). */
export async function composePage(
  project: Project,
  template: Template | null,
  variant: PageVariant,
  pageIndex: number,
  illustrationPng?: Buffer,
): Promise<Buffer> {
  const storage = getStorage();
  const zones = parseZones(template, project.pageWidth, project.pageHeight);
  const colors = (project.brandColors as string[]) ?? [];
  let backgroundImage: Buffer | undefined;
  if (template?.assetKey) {
    try {
      backgroundImage = await storage.get(template.assetKey);
    } catch {
      backgroundImage = undefined;
    }
  }
  let logoImage: Buffer | undefined;
  if (project.logoAssetKey) {
    try {
      logoImage = await storage.get(project.logoAssetKey);
    } catch {
      logoImage = undefined;
    }
  }
  let mascotImage: Buffer | undefined;
  if (project.mascotAssetKey) {
    try {
      mascotImage = await storage.get(project.mascotAssetKey);
    } catch {
      mascotImage = undefined;
    }
  }

  const spec: RenderSpec = {
    width: project.pageWidth,
    height: project.pageHeight,
    backgroundColor: "#FFFFFF",
    backgroundImage,
    illustrationPng,
    logoImage,
    mascotImage,
    zones,
    title: variant.title,
    whyLearn: variant.whyLearn,
    blocks: (variant.blocks as ContentBlock[]) ?? [],
    callouts: (variant.callouts as Callout[]) ?? [],
    keyTakeaway: variant.keyTakeaway,
    exampleActivity: variant.exampleActivity,
    knowledgeCheck: (variant.knowledgeCheck as KnowledgeCheckItem[]) ?? [],
    headerText: `${project.subject} · ${variant.level === "novice" ? "Foundations" : "Advanced"}`,
    footerText: project.collegeName,
    pageNumber: String(pageIndex + 1),
    sourceNote: ((variant.sourceRefs as string[]) ?? []).join("; "),
    brand: {
      primary: colors[0] ?? "#1F3A5F",
      accent: colors[1] ?? "#E8A13D",
      paper: colors[2] ?? "#FAF7F2",
    },
  };
  return getRenderer().render(spec);
}
