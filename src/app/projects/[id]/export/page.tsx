"use client";

import { use, useCallback, useEffect, useState } from "react";
import { getJSON, postJSON } from "@/lib/clientApi";
import type { ExportArtifactDto, ProjectDto } from "@/lib/uiTypes";
import { assetUrl } from "@/lib/uiTypes";
import { Badge, Button, Card, ErrorNote, Spinner } from "@/components/ui";
import { JobProgress } from "@/components/JobProgress";

export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [artifacts, setArtifacts] = useState<ExportArtifactDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([
        getJSON<ProjectDto>(`/api/projects/${id}`),
        getJSON<ExportArtifactDto[]>(`/api/projects/${id}/export`),
      ]);
      setProject(p);
      setArtifacts(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!project) return <Spinner label="Loading export…" />;

  async function runExport(levels: "novice" | "advanced" | "both") {
    setError(null);
    try {
      const res = await postJSON<{ jobId: string }>(`/api/projects/${id}/export`, { levels });
      setJobId(res.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start export");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorNote message={error} />
      <Card title="Export final booklet (PDF)">
        <p className="mb-3 text-sm text-slate-600">
          Pages with a generated visual use their composed version; other pages
          are composed deterministically from approved text and the template.
        </p>
        {jobId ? (
          <JobProgress
            jobId={jobId}
            label="export"
            onDone={async () => {
              setJobId(null);
              await reload();
            }}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => runExport("novice")}>Export novice version</Button>
            <Button onClick={() => runExport("advanced")}>Export advanced version</Button>
            <Button variant="secondary" onClick={() => runExport("both")}>
              Export both
            </Button>
          </div>
        )}
      </Card>

      <Card title="Previous exports">
        {artifacts.length === 0 ? (
          <p className="text-sm text-slate-500">No exports yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {artifacts.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded border border-slate-100 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Badge tone="indigo">{a.levels}</Badge>
                  <span className="uppercase text-xs text-slate-500">{a.format}</span>
                  <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
                </span>
                <a
                  href={assetUrl(a.assetKey)}
                  download
                  className="font-medium text-purple-700 hover:underline"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
