import { prisma } from "@/lib/db";
import { getTextProvider } from "@/lib/providers/text";
import type { PageVariantContent } from "@/lib/content/schemas";
import type { JobContext } from "@/lib/queue/types";
import type { PageVariant, Prisma, SourceChunk } from "@prisma/client";

/** Cap the source context sent per page so large documents are never sent whole. */
const MAX_PAGE_CONTEXT_CHARS = 14000;
const PREVIEW_CHARS = 240;

type ProjectBriefRow = {
  subject: string;
  audience: string;
  learningGoals: string;
  tone: string;
  targetPageCount: number;
};

function brief(p: ProjectBriefRow) {
  return {
    subject: p.subject,
    audience: p.audience,
    learningGoals: p.learningGoals,
    tone: p.tone,
    targetPageCount: p.targetPageCount,
  };
}

/** Map validated generated content onto PageVariant columns. */
export function variantData(content: PageVariantContent) {
  return {
    title: content.title,
    learningObjective: content.learningObjective,
    blocks: content.blocks as Prisma.InputJsonValue,
    keyTakeaway: content.keyTakeaway,
    exampleActivity: content.exampleActivity,
    glossary: content.glossary as Prisma.InputJsonValue,
    sourceRefs: content.sourceRefs as Prisma.InputJsonValue,
    visualBrief: content.visualBrief,
    aadhiRole: content.aadhiRole,
    aadhiPose: content.aadhiPose,
    aadhiExpression: content.aadhiExpression,
    aadhiPlacement: content.aadhiPlacement,
    insufficientSource: content.insufficientSource,
  };
}

export function variantSnapshot(variant: PageVariant): Prisma.InputJsonValue {
  return {
    title: variant.title,
    learningObjective: variant.learningObjective,
    blocks: variant.blocks,
    keyTakeaway: variant.keyTakeaway,
    exampleActivity: variant.exampleActivity,
    glossary: variant.glossary,
    sourceRefs: variant.sourceRefs,
    visualBrief: variant.visualBrief,
    aadhiRole: variant.aadhiRole,
    aadhiPose: variant.aadhiPose,
    aadhiExpression: variant.aadhiExpression,
    aadhiPlacement: variant.aadhiPlacement,
    insufficientSource: variant.insufficientSource,
  } as Prisma.InputJsonValue;
}

/** Enforce that cited refs exist in the source — fabricated citations are dropped. */
function sanitizeRefs(content: PageVariantContent, allowed: string[]): PageVariantContent {
  const allowedSet = new Set(allowed);
  return {
    ...content,
    sourceRefs: content.sourceRefs.filter((r) => allowedSet.has(r)),
  };
}

function selectChunksWithinBudget(chunks: SourceChunk[]): SourceChunk[] {
  const selected: SourceChunk[] = [];
  let total = 0;
  for (const chunk of chunks) {
    if (total + chunk.charCount > MAX_PAGE_CONTEXT_CHARS && selected.length > 0) break;
    selected.push(chunk);
    total += chunk.charCount;
  }
  return selected;
}

export async function generateProjectContent(
  projectId: string,
  ctx: JobContext,
): Promise<{ pageCount: number; warning?: string }> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      sources: { include: { chunks: { orderBy: { index: "asc" } } } },
    },
  });
  const chunks = project.sources
    .filter((s) => s.status !== "unreadable")
    .flatMap((s) => s.chunks);
  if (chunks.length === 0) {
    throw new Error(
      "No usable source material. Upload readable documents (scanned/unreadable files are flagged and skipped).",
    );
  }

  const { provider, warning } = await getTextProvider(project.textProvider);
  await ctx.progress(5, `Planning pages (${provider.name})`);

  const outline = await provider.outline({
    project: brief(project),
    chunks: chunks.map((c) => ({
      id: c.id,
      sourceRef: c.sourceRef,
      preview: c.text.slice(0, PREVIEW_CHARS),
    })),
  });

  // Normalize the plan: keep only known chunk ids, give chunkless pages a
  // fair share of any unassigned chunks, and cap total page count.
  const byId = new Map(chunks.map((c) => [c.id, c]));
  let plan = outline.pages
    .slice(0, project.targetPageCount + 2)
    .map((p) => ({ ...p, chunkIds: p.chunkIds.filter((id) => byId.has(id)) }));
  if (plan.length === 0) {
    // Provider returned no usable plan — fall back to sequential allocation.
    const count = Math.min(project.targetPageCount, chunks.length);
    const perPage = Math.ceil(chunks.length / count);
    plan = Array.from({ length: count }, (_, i) => ({
      title: `${project.subject} — Part ${i + 1}`,
      objective: "",
      chunkIds: chunks.slice(i * perPage, (i + 1) * perPage).map((c) => c.id),
    }));
  }
  const assigned = new Set(plan.flatMap((p) => p.chunkIds));
  const unassigned = chunks.filter((c) => !assigned.has(c.id));
  for (const [i, chunk] of unassigned.entries()) {
    plan[i % plan.length].chunkIds.push(chunk.id);
  }
  const pages = plan.filter((p) => p.chunkIds.length > 0);
  if (pages.length === 0) throw new Error("The provider returned an empty page plan.");

  // Full regeneration replaces existing pages (single pages regenerate separately).
  await prisma.page.deleteMany({ where: { projectId } });

  for (const [i, planned] of pages.entries()) {
    await ctx.progress(
      10 + (85 * i) / pages.length,
      `Generating page ${i + 1} of ${pages.length}: ${planned.title}`,
    );
    const pageChunks = selectChunksWithinBudget(
      planned.chunkIds.map((id) => byId.get(id)!),
    );
    const allowedRefs = Array.from(new Set(pageChunks.map((c) => c.sourceRef)));
    const result = await provider.generatePage({
      project: brief(project),
      pageTitle: planned.title,
      pageObjective: planned.objective,
      pageIndex: i,
      totalPages: pages.length,
      chunks: pageChunks.map((c) => ({ id: c.id, sourceRef: c.sourceRef, text: c.text })),
      allowedSourceRefs: allowedRefs,
    });

    await prisma.page.create({
      data: {
        projectId,
        index: i,
        chunkIds: pageChunks.map((c) => c.id) as Prisma.InputJsonValue,
        variants: {
          create: (["novice", "advanced"] as const).map((level) => {
            const content = sanitizeRefs(result[level], allowedRefs);
            return {
              level,
              ...variantData(content),
              versions: {
                create: {
                  snapshot: variantData(content) as Prisma.InputJsonValue,
                  note: `Generated (${provider.name})`,
                },
              },
            };
          }),
        },
      },
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "content" },
  });
  return { pageCount: pages.length, warning };
}

export async function regeneratePageContent(
  pageId: string,
  ctx: JobContext,
): Promise<{ warning?: string }> {
  const page = await prisma.page.findUniqueOrThrow({
    where: { id: pageId },
    include: { project: true, variants: true },
  });
  const chunkIds = (page.chunkIds as string[]) ?? [];
  const chunks = await prisma.sourceChunk.findMany({ where: { id: { in: chunkIds } } });
  if (chunks.length === 0) {
    throw new Error("This page has no linked source chunks; regenerate the whole project instead.");
  }
  const { provider, warning } = await getTextProvider(page.project.textProvider);
  const novice = page.variants.find((v) => v.level === "novice");
  await ctx.progress(20, `Regenerating page ${page.index + 1} (${provider.name})`);

  const pageChunks = selectChunksWithinBudget(chunks);
  const allowedRefs = Array.from(new Set(pageChunks.map((c) => c.sourceRef)));
  const totalPages = await prisma.page.count({ where: { projectId: page.projectId } });
  const result = await provider.generatePage({
    project: brief(page.project),
    pageTitle: novice?.title || `Page ${page.index + 1}`,
    pageObjective: novice?.learningObjective || "",
    pageIndex: page.index,
    totalPages,
    chunks: pageChunks.map((c) => ({ id: c.id, sourceRef: c.sourceRef, text: c.text })),
    allowedSourceRefs: allowedRefs,
  });

  for (const level of ["novice", "advanced"] as const) {
    const content = sanitizeRefs(result[level], allowedRefs);
    await prisma.pageVariant.update({
      where: { pageId_level: { pageId, level } },
      data: {
        ...variantData(content),
        approvedAt: null, // regenerated content must be re-approved before visuals
        versions: {
          create: {
            snapshot: variantData(content) as Prisma.InputJsonValue,
            note: `Regenerated (${provider.name})`,
          },
        },
      },
    });
  }
  return { warning };
}
