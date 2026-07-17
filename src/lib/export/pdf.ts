import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { composePage } from "@/lib/visuals/pipeline";
import type { JobContext } from "@/lib/queue/types";

export type ExportPayload = {
  projectId: string;
  levels: "novice" | "advanced" | "both";
};

/**
 * Assemble export-quality PDFs from composed pages. Pages whose visual was
 * never generated are composed deterministically (text over template) so an
 * export always succeeds for approved content.
 */
export async function exportProject(
  payload: ExportPayload,
  ctx: JobContext,
): Promise<{ artifactIds: string[] }> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: payload.projectId },
    include: {
      template: true,
      pages: {
        orderBy: { index: "asc" },
        include: { variants: true, visuals: { orderBy: { version: "desc" } } },
      },
    },
  });
  if (project.pages.length === 0) throw new Error("This project has no pages to export.");

  const storage = getStorage();
  const levels: ("novice" | "advanced")[] =
    payload.levels === "both" ? ["novice", "advanced"] : [payload.levels];
  const artifactIds: string[] = [];

  for (const [li, level] of levels.entries()) {
    const pdf = await PDFDocument.create();
    for (const [pi, page] of project.pages.entries()) {
      await ctx.progress(
        5 + 90 * ((li * project.pages.length + pi) / (levels.length * project.pages.length)),
        `Exporting ${level} page ${pi + 1}/${project.pages.length}`,
      );
      const variant = page.variants.find((v) => v.level === level);
      if (!variant) continue;

      // Prefer the active/locked composed visual for this level; else compose now.
      const active =
        page.visuals.find((v) => v.id === page.activeVisualId && v.level === level) ??
        page.visuals.find((v) => v.level === level && v.status === "complete");
      let png: Buffer;
      if (active?.composedAssetKey && (await storage.exists(active.composedAssetKey))) {
        png = await storage.get(active.composedAssetKey);
      } else {
        let illustration: Buffer | undefined;
        if (active?.illustrationAssetKey && (await storage.exists(active.illustrationAssetKey))) {
          illustration = await storage.get(active.illustrationAssetKey);
        }
        png = await composePage(project, project.template, variant, page.index, illustration);
      }

      const image = await pdf.embedPng(png);
      const pdfPage = pdf.addPage([project.pageWidth, project.pageHeight]);
      pdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: project.pageWidth,
        height: project.pageHeight,
      });
    }

    const bytes = Buffer.from(await pdf.save());
    const key = `projects/${project.id}/exports/${level}-${Date.now()}.pdf`;
    await storage.put(key, bytes, "application/pdf");
    const artifact = await prisma.exportArtifact.create({
      data: { projectId: project.id, levels: level, format: "pdf", assetKey: key },
    });
    artifactIds.push(artifact.id);
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { status: "exported" },
  });
  return { artifactIds };
}
