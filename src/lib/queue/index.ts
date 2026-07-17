import type { JobHandler, JobQueue, JobType } from "./types";
import { InProcessQueue } from "./inProcess";
import { jobHandlers } from "@/lib/jobs/handlers";

export type { JobQueue, JobType, JobContext } from "./types";

const globalForQueue = globalThis as unknown as { jobQueue?: JobQueue };

export function getQueue(): JobQueue {
  if (!globalForQueue.jobQueue) {
    // QUEUE_DRIVER currently supports "inprocess"; a Redis-backed driver can
    // be added here without changing any enqueue call site.
    globalForQueue.jobQueue = new InProcessQueue(
      jobHandlers as Map<JobType, JobHandler>,
    );
  }
  return globalForQueue.jobQueue;
}
