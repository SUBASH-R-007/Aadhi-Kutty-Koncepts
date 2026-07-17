import { prisma } from "@/lib/db";
import { getStorage, contentTypeFor } from "@/lib/storage";
import {
  extractDocument,
  extractPlainText,
  type SourceKind,
} from "@/lib/extraction";
import { chunkSegments } from "@/lib/extraction/chunking";
import type { SourceDocument } from "@prisma/client";

/**
 * Ingest an uploaded document or pasted text: store the raw file, extract
 * text with provenance, chunk it, and persist everything for user review.
 */
export async function ingestSource(
  projectId: string,
  input: { kind: SourceKind; filename: string; buffer: Buffer },
): Promise<SourceDocument> {
  const storage = getStorage();
  let rawAssetKey: string | null = null;
  if (input.kind !== "paste") {
    rawAssetKey = `projects/${projectId}/sources/${Date.now()}-${sanitizeName(input.filename)}`;
    await storage.put(rawAssetKey, input.buffer, contentTypeFor(input.filename));
  }

  const extraction = await extractDocument(input.kind, input.buffer, input.filename);
  const chunks = chunkSegments(extraction.segments);

  return prisma.sourceDocument.create({
    data: {
      projectId,
      filename: input.filename,
      kind: input.kind,
      status: extraction.warning && chunks.length === 0 ? "unreadable" : "extracted",
      warning: extraction.warning ?? null,
      rawAssetKey,
      extractedText: extraction.text,
      chunks: {
        create: chunks.map((c, index) => ({
          index,
          text: c.text,
          sourceRef: c.sourceRef,
          charCount: c.charCount,
        })),
      },
    },
    include: { chunks: true },
  });
}

/** Apply user corrections to extracted text and rebuild the chunks. */
export async function updateSourceText(
  sourceId: string,
  correctedText: string,
): Promise<SourceDocument> {
  const source = await prisma.sourceDocument.findUniqueOrThrow({
    where: { id: sourceId },
  });
  const extraction = extractPlainText(correctedText, source.filename);
  const chunks = chunkSegments(extraction.segments);
  await prisma.sourceChunk.deleteMany({ where: { documentId: sourceId } });
  return prisma.sourceDocument.update({
    where: { id: sourceId },
    data: {
      extractedText: correctedText,
      status: chunks.length === 0 ? "unreadable" : "extracted",
      warning: chunks.length === 0 ? "The corrected text is empty." : null,
      chunks: {
        create: chunks.map((c, index) => ({
          index,
          text: c.text,
          sourceRef: c.sourceRef,
          charCount: c.charCount,
        })),
      },
    },
    include: { chunks: true },
  });
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
