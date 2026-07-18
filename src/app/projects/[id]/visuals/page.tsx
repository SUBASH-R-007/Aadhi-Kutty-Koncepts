"use client";

import { use, useCallback, useEffect, useState } from "react";
import { getJSON, patchJSON, postJSON } from "@/lib/clientApi";
import type { CreativeContextDto, PageDto, ProjectDto, VisualDto } from "@/lib/uiTypes";
import { assetUrl } from "@/lib/uiTypes";
import { Badge, Button, Card, ErrorNote, Field, Input, Select, Spinner, WarningNote } from "@/components/ui";
import { JobProgress } from "@/components/JobProgress";

type Level = "novice" | "advanced";

export default function VisualsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [contexts, setContexts] = useState<CreativeContextDto[]>([]);
  const [level, setLevel] = useState<Level>("novice");
  const [error, setError] = useState<string | null>(null);
  const [batchJobIds, setBatchJobIds] = useState<string[]>([]);

  const reload = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        getJSON<ProjectDto>(`/api/projects/${id}`),
        getJSON<CreativeContextDto[]>(`/api/creative-contexts`),
      ]);
      setProject(p);
      setContexts(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!project) return <Spinner label="Loading visuals…" />;

  const approvedCount = project.pages.filter((p) =>
    p.variants.find((v) => v.level === level)?.approvedAt,
  ).length;

  async function generateAll() {
    setError(null);
    try {
      const { jobIds } = await postJSON<{ jobIds: string[] }>(`/api/projects/${id}/visuals`, { level });
      setBatchJobIds(jobIds);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start batch generation");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorNote message={error} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div role="group" aria-label="Reading level" className="flex rounded-md border border-slate-300 bg-white p-0.5">
            {(["novice", "advanced"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                aria-pressed={level === l}
                className={`rounded px-3 py-1 text-sm font-medium capitalize ${level === l ? "bg-purple-700 text-white" : "text-slate-700"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <Badge tone={approvedCount > 0 ? "green" : "amber"}>
            {approvedCount}/{project.pages.length} approved
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="cc-select" className="text-xs font-medium text-slate-600">
            Creative context
          </label>
          <Select
            id="cc-select"
            className="w-56"
            value={project.creativeContextId ?? ""}
            onChange={async (e) => {
              try {
                await patchJSON(`/api/projects/${id}`, {
                  creativeContextId: e.target.value || null,
                });
                await reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not set context");
              }
            }}
          >
            <option value="">— None —</option>
            {contexts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} v{c.version}
              </option>
            ))}
          </Select>
          <Button onClick={generateAll} disabled={approvedCount === 0 || batchJobIds.length > 0}>
            Generate all approved pages
          </Button>
        </div>
      </div>
      {approvedCount === 0 && (
        <WarningNote message="Visuals need approved content. Open the Content step and use “Save & approve for visuals” on each page first." />
      )}
      {batchJobIds.length > 0 && (
        <Card title={`Batch generation (${batchJobIds.length} pages)`}>
          <div className="flex flex-col gap-3">
            {batchJobIds.map((jobId) => (
              <JobProgress key={jobId} jobId={jobId} onDone={() => void reload()} />
            ))}
            <Button size="sm" variant="secondary" onClick={() => setBatchJobIds([])}>
              Clear
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {project.pages.map((page) => (
          <PageVisualCard key={page.id} page={page} level={level} onChanged={reload} />
        ))}
      </div>
    </div>
  );
}

function PageVisualCard({
  page,
  level,
  onChanged,
}: {
  page: PageDto;
  level: Level;
  onChanged: () => Promise<void>;
}) {
  const variant = page.variants.find((v) => v.level === level);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pose, setPose] = useState("");
  const [style, setStyle] = useState("");
  const [compareId, setCompareId] = useState<string | null>(null);

  const active =
    page.visuals.find((v) => v.id === page.activeVisualId) ??
    page.visuals.find((v) => v.level === level && v.status === "complete");
  const compare = page.visuals.find((v) => v.id === compareId) ?? null;

  async function generate() {
    setError(null);
    try {
      const { jobId: jid } = await postJSON<{ jobId: string }>(`/api/pages/${page.id}/visual`, {
        level,
        ...(pose ? { poseOverride: pose } : {}),
        ...(style ? { styleOverride: style } : {}),
      });
      setJobId(jid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start generation");
    }
  }

  async function setLock(locked: boolean) {
    setError(null);
    try {
      await patchJSON(`/api/pages/${page.id}`, { visualLocked: locked });
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lock failed");
    }
  }

  async function restore(visual: VisualDto) {
    setError(null);
    try {
      await patchJSON(`/api/pages/${page.id}`, { activeVisualId: visual.id });
      setCompareId(null);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    }
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          Page {page.index + 1}: {variant?.title ?? "(no variant)"}
          {page.visualLocked && <Badge tone="indigo">🔒 locked</Badge>}
          {!variant?.approvedAt && <Badge tone="amber">not approved</Badge>}
        </span>
      }
      actions={
        <Button size="sm" variant="secondary" onClick={() => setLock(!page.visualLocked)}>
          {page.visualLocked ? "Unlock" : "Lock visual"}
        </Button>
      }
    >
      <ErrorNote message={error} />
      <div className={`grid gap-2 ${compare ? "grid-cols-2" : "grid-cols-1"}`}>
        <figure>
          {active?.composedAssetKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(active.composedAssetKey)}
              alt={`Composed page ${page.index + 1} (version ${active.version})`}
              className="w-full rounded border border-slate-200"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded border border-dashed border-slate-300 text-sm text-slate-400">
              No visual yet
            </div>
          )}
          {active && <figcaption className="mt-1 text-xs text-slate-500">Active: v{active.version} · {active.level}</figcaption>}
        </figure>
        {compare && compare.composedAssetKey && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(compare.composedAssetKey)}
              alt={`Comparison version ${compare.version}`}
              className="w-full rounded border border-amber-300"
            />
            <figcaption className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Compare: v{compare.version} · {compare.level}</span>
              <span className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => restore(compare)}>
                  Restore this version
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCompareId(null)}>
                  Close
                </Button>
              </span>
            </figcaption>
          </figure>
        )}
      </div>

      {page.visuals.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
          <span className="text-slate-500">Versions:</span>
          {page.visuals.map((v) => (
            <button
              key={v.id}
              onClick={() => setCompareId(v.id === compareId ? null : v.id)}
              className={`rounded border px-2 py-0.5 ${v.id === page.activeVisualId ? "border-purple-400 bg-purple-50 text-purple-800" : "border-slate-200 hover:bg-slate-50"}`}
            >
              v{v.version}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Field label="Aadhi pose override" htmlFor={`pose-${page.id}`}>
          <Input id={`pose-${page.id}`} placeholder={variant?.aadhiPose ?? "pointing"} value={pose} onChange={(e) => setPose(e.target.value)} />
        </Field>
        <Field label="Visual style override" htmlFor={`style-${page.id}`}>
          <Input id={`style-${page.id}`} placeholder="project default" value={style} onChange={(e) => setStyle(e.target.value)} />
        </Field>
      </div>
      <div className="mt-2">
        {jobId ? (
          <JobProgress
            jobId={jobId}
            label="visual generation"
            onDone={async () => {
              setJobId(null);
              await onChanged();
            }}
          />
        ) : (
          <Button size="sm" onClick={generate} disabled={!variant?.approvedAt || page.visualLocked}>
            {active ? "Regenerate visual" : "Generate visual"}
          </Button>
        )}
      </div>
    </Card>
  );
}
