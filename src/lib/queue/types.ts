export type JobType =
  | "generate-content"
  | "regenerate-page"
  | "generate-visual"
  | "export";

export type JobContext = {
  jobId: string;
  /** Report progress (0-100) and a human-readable status message. */
  progress(pct: number, message: string): Promise<void>;
};

export type JobHandler = (payload: unknown, ctx: JobContext) => Promise<unknown>;

/**
 * Background job abstraction. The in-process driver runs jobs inside the
 * Next.js server process (development). Because jobs are persisted as
 * GenerationJob rows and handlers are addressed by type, a Redis/BullMQ
 * driver can replace the in-process one without touching call sites.
 */
export interface JobQueue {
  enqueue(type: JobType, payload: unknown, projectId?: string): Promise<string>;
}
