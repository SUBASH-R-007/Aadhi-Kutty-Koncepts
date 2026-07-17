import { z } from "zod";
import {
  generateProjectContent,
  regeneratePageContent,
} from "@/lib/generation/pipeline";
import { generatePageVisual } from "@/lib/visuals/pipeline";
import { exportProject } from "@/lib/export/pdf";
import type { JobContext, JobHandler, JobType } from "@/lib/queue/types";

const generateContentPayload = z.object({ projectId: z.string() });
const regeneratePagePayload = z.object({ pageId: z.string() });
const generateVisualPayload = z.object({
  pageId: z.string(),
  level: z.enum(["novice", "advanced"]),
  poseOverride: z.string().optional(),
  styleOverride: z.string().optional(),
  extraInstructions: z.string().optional(),
});
const exportPayload = z.object({
  projectId: z.string(),
  levels: z.enum(["novice", "advanced", "both"]),
});

export const jobHandlers = new Map<JobType, JobHandler>([
  [
    "generate-content",
    (payload: unknown, ctx: JobContext) =>
      generateProjectContent(generateContentPayload.parse(payload).projectId, ctx),
  ],
  [
    "regenerate-page",
    (payload: unknown, ctx: JobContext) =>
      regeneratePageContent(regeneratePagePayload.parse(payload).pageId, ctx),
  ],
  [
    "generate-visual",
    (payload: unknown, ctx: JobContext) =>
      generatePageVisual(generateVisualPayload.parse(payload), ctx),
  ],
  [
    "export",
    (payload: unknown, ctx: JobContext) => exportProject(exportPayload.parse(payload), ctx),
  ],
]);
