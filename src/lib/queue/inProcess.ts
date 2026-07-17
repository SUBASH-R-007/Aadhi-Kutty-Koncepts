import { prisma } from "@/lib/db";
import type { JobHandler, JobQueue, JobType } from "./types";

const CONCURRENCY = 2;

/**
 * Development queue: persists each job as a GenerationJob row, then executes
 * it in the server process with limited concurrency. Survives hot reloads via
 * a globalThis singleton. Jobs interrupted by a server restart stay visible
 * in their last persisted state; re-enqueue them from the UI.
 */
export class InProcessQueue implements JobQueue {
  private running = 0;
  private pending: string[] = [];
  private handlers: Map<JobType, JobHandler>;

  constructor(handlers: Map<JobType, JobHandler>) {
    this.handlers = handlers;
  }

  async enqueue(type: JobType, payload: unknown, projectId?: string): Promise<string> {
    const job = await prisma.generationJob.create({
      data: {
        type,
        payload: payload as object,
        projectId: projectId ?? null,
        status: "queued",
        message: "Queued",
      },
    });
    this.pending.push(job.id);
    void this.pump();
    return job.id;
  }

  private async pump(): Promise<void> {
    while (this.running < CONCURRENCY && this.pending.length > 0) {
      const jobId = this.pending.shift()!;
      this.running++;
      void this.run(jobId).finally(() => {
        this.running--;
        void this.pump();
      });
    }
  }

  private async run(jobId: string): Promise<void> {
    const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
    if (!job || job.status === "complete" || job.status === "failed") return;
    const handler = this.handlers.get(job.type as JobType);
    if (!handler) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: "failed", error: `No handler for job type ${job.type}` },
      });
      return;
    }
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "running", message: "Started", progress: 1 },
    });
    try {
      const result = await handler(job.payload, {
        jobId,
        progress: async (pct, message) => {
          await prisma.generationJob.update({
            where: { id: jobId },
            data: { progress: Math.max(0, Math.min(100, Math.round(pct))), message },
          });
        },
      });
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "complete",
          progress: 100,
          message: "Done",
          result: (result ?? {}) as object,
        },
      });
    } catch (e) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          error: e instanceof Error ? e.message : String(e),
        },
      });
    }
  }
}
