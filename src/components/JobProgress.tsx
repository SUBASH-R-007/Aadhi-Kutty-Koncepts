"use client";

import { useEffect, useRef, useState } from "react";
import { getJSON } from "@/lib/clientApi";
import type { JobDto } from "@/lib/uiTypes";

/** Polls a background job and reports completion/failure to the parent. */
export function JobProgress({
  jobId,
  onDone,
  label,
}: {
  jobId: string;
  onDone?: (job: JobDto) => void;
  label?: string;
}) {
  const [job, setJob] = useState<JobDto | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const timer = setInterval(async () => {
      try {
        const j = await getJSON<JobDto>(`/api/jobs/${jobId}`);
        setJob(j);
        if ((j.status === "complete" || j.status === "failed") && !doneRef.current) {
          doneRef.current = true;
          clearInterval(timer);
          onDone?.(j);
        }
      } catch {
        // transient polling error — keep trying
      }
    }, 1200);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (!job) return <p className="text-sm text-slate-500">Starting {label ?? "job"}…</p>;
  return (
    <div className="flex flex-col gap-1" aria-live="polite">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{job.status === "failed" ? "Failed" : job.message || job.status}</span>
        <span>{job.progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-all ${job.status === "failed" ? "bg-red-500" : "bg-purple-600"}`}
          style={{ width: `${Math.max(job.progress, 4)}%` }}
        />
      </div>
      {job.status === "failed" && job.error && (
        <p role="alert" className="text-xs text-red-700">
          {job.error}
        </p>
      )}
      {job.result?.warning && (
        <p className="text-xs text-amber-700">{job.result.warning}</p>
      )}
    </div>
  );
}
