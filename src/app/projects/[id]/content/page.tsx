"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { getJSON, patchJSON, postJSON } from "@/lib/clientApi";
import type { PageDto, ProjectDto, VariantDto } from "@/lib/uiTypes";
import { estimateOverflow } from "@/lib/render/textLayout";
import { defaultZones } from "@/lib/templates";
import { Badge, Button, Card, ErrorNote, Field, Input, Select, Spinner, Textarea, WarningNote } from "@/components/ui";
import { JobProgress } from "@/components/JobProgress";

type Level = "novice" | "advanced";

export default function ContentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [level, setLevel] = useState<Level>("novice");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setProject(await getJSON<ProjectDto>(`/api/projects/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!project) return <Spinner label="Loading editor…" />;
  if (project.pages.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          No pages yet — go to the <strong>Source</strong> step and generate content first.
        </p>
      </Card>
    );
  }

  const page = project.pages[Math.min(pageIndex, project.pages.length - 1)];

  return (
    <div className="flex flex-col gap-4">
      <ErrorNote message={error} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Page navigator" className="flex flex-wrap gap-1">
          {project.pages.map((p, i) => {
            const variant = p.variants.find((v) => v.level === level);
            return (
              <button
                key={p.id}
                onClick={() => setPageIndex(i)}
                aria-current={i === pageIndex ? "page" : undefined}
                className={`h-8 w-8 rounded-md text-xs font-semibold ${
                  i === pageIndex
                    ? "bg-indigo-700 text-white"
                    : variant?.approvedAt
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                title={variant?.title ?? `Page ${i + 1}`}
              >
                {i + 1}
              </button>
            );
          })}
        </nav>
        <div role="group" aria-label="Reading level" className="flex rounded-md border border-slate-300 bg-white p-0.5">
          {(["novice", "advanced"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              aria-pressed={level === l}
              className={`rounded px-3 py-1 text-sm font-medium capitalize ${level === l ? "bg-indigo-700 text-white" : "text-slate-700"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <PageEditor
        key={`${page.id}-${level}`}
        project={project}
        page={page}
        level={level}
        onChanged={reload}
      />
    </div>
  );
}

function PageEditor({
  project,
  page,
  level,
  onChanged,
}: {
  project: ProjectDto;
  page: PageDto;
  level: Level;
  onChanged: () => Promise<void>;
}) {
  const variant = page.variants.find((v) => v.level === level)!;
  const [draft, setDraft] = useState<VariantDto>(variant);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenJobId, setRegenJobId] = useState<string | null>(null);

  const set = <K extends keyof VariantDto>(key: K, value: VariantDto[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const overflow = useMemo(() => {
    const zones = project.template?.zones ?? defaultZones(project.pageWidth, project.pageHeight);
    const body = zones.body ?? { x: 0, y: 0, w: 0.5, h: 0.6 };
    const title = zones.title ?? { x: 0, y: 0, w: 0.9, h: 0.1 };
    const base = Math.min(project.pageWidth, project.pageHeight);
    return estimateOverflow({
      title: draft.title,
      blocks: draft.blocks,
      keyTakeaway: draft.keyTakeaway,
      exampleActivity: draft.exampleActivity,
      bodyZonePx: { w: body.w * project.pageWidth, h: body.h * project.pageHeight },
      titleZonePx: { w: title.w * project.pageWidth, h: title.h * project.pageHeight },
      bodyFontSize: base * 0.021,
      headingFontSize: base * 0.026,
      titleFontSize: base * 0.05,
    });
  }, [draft, project]);

  async function save(approve: boolean) {
    setSaving(true);
    setError(null);
    try {
      await patchJSON(`/api/pages/${page.id}/variants/${level}`, {
        content: {
          title: draft.title,
          learningObjective: draft.learningObjective,
          blocks: draft.blocks,
          keyTakeaway: draft.keyTakeaway,
          exampleActivity: draft.exampleActivity,
          glossary: draft.glossary,
          sourceRefs: draft.sourceRefs,
          visualBrief: draft.visualBrief,
          aadhiRole: draft.aadhiRole,
          aadhiPose: draft.aadhiPose,
          aadhiExpression: draft.aadhiExpression,
          aadhiPlacement: draft.aadhiPlacement,
          insufficientSource: draft.insufficientSource,
        },
        approve,
        note: approve ? "Saved" : "Edited",
      });
      setDirty(false);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function restoreVersion(versionId: string) {
    setError(null);
    try {
      await postJSON(`/api/versions/${versionId}/restore`, {});
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    }
  }

  async function regenerate() {
    setError(null);
    try {
      const { jobId } = await postJSON<{ jobId: string }>(`/api/pages/${page.id}/regenerate`, {});
      setRegenJobId(jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start regeneration");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-4">
        <ErrorNote message={error} />
        {variant.insufficientSource && (
          <WarningNote message="The provider flagged that the source material was insufficient for this page — review carefully." />
        )}
        <Card
          title={`Page ${page.index + 1} · ${level}`}
          actions={
            <div className="flex items-center gap-2">
              {overflow.overflows ? (
                <Badge tone="amber">Text may overflow ({Math.round(overflow.ratio * 100)}% of zone)</Badge>
              ) : (
                <Badge tone="green">Fits template</Badge>
              )}
              {variant.approvedAt && !dirty ? <Badge tone="green">Approved</Badge> : dirty ? <Badge tone="amber">Unsaved changes</Badge> : <Badge tone="slate">Saved</Badge>}
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <Field label="Page title" htmlFor="title">
              <Input id="title" value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="Learning objective" htmlFor="objective">
              <Input id="objective" value={draft.learningObjective} onChange={(e) => set("learningObjective", e.target.value)} />
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-medium text-slate-700">Content blocks</legend>
              {draft.blocks.map((block, i) => (
                <div key={i} className="rounded-md border border-slate-200 p-2">
                  <Input
                    aria-label={`Block ${i + 1} heading`}
                    className="mb-1"
                    placeholder="Heading (optional)"
                    value={block.heading ?? ""}
                    onChange={(e) =>
                      set("blocks", draft.blocks.map((b, j) => (j === i ? { ...b, heading: e.target.value } : b)))
                    }
                  />
                  <Textarea
                    aria-label={`Block ${i + 1} body`}
                    rows={3}
                    value={block.body}
                    onChange={(e) =>
                      set("blocks", draft.blocks.map((b, j) => (j === i ? { ...b, body: e.target.value } : b)))
                    }
                  />
                  <div className="mt-1 flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => set("blocks", draft.blocks.filter((_, j) => j !== i))}>
                      Remove block
                    </Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={() => set("blocks", [...draft.blocks, { heading: "", body: "" }])}>
                + Add block
              </Button>
            </fieldset>

            <Field label="Key takeaway" htmlFor="takeaway">
              <Textarea id="takeaway" rows={2} value={draft.keyTakeaway} onChange={(e) => set("keyTakeaway", e.target.value)} />
            </Field>
            <Field label="Example or activity" htmlFor="activity">
              <Textarea id="activity" rows={2} value={draft.exampleActivity} onChange={(e) => set("exampleActivity", e.target.value)} />
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-medium text-slate-700">Glossary terms</legend>
              {draft.glossary.map((g, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    aria-label={`Glossary term ${i + 1}`}
                    className="w-1/3"
                    value={g.term}
                    onChange={(e) => set("glossary", draft.glossary.map((x, j) => (j === i ? { ...x, term: e.target.value } : x)))}
                  />
                  <Input
                    aria-label={`Definition for ${g.term || `term ${i + 1}`}`}
                    value={g.definition}
                    onChange={(e) => set("glossary", draft.glossary.map((x, j) => (j === i ? { ...x, definition: e.target.value } : x)))}
                  />
                  <Button size="sm" variant="ghost" onClick={() => set("glossary", draft.glossary.filter((_, j) => j !== i))}>
                    ✕
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={() => set("glossary", [...draft.glossary, { term: "", definition: "" }])}>
                + Add term
              </Button>
            </fieldset>

            <div>
              <p className="text-xs font-medium text-slate-700">Source references</p>
              <ul className="mt-1 flex flex-wrap gap-1">
                {draft.sourceRefs.length === 0 && <li className="text-xs text-slate-500">None — the provider found no citable chunks.</li>}
                {draft.sourceRefs.map((r) => (
                  <li key={r}>
                    <Badge tone="indigo">{r}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card title="Visual plan (used for image generation)">
          <div className="flex flex-col gap-3">
            <Field label="Visual brief" htmlFor="brief" hint="Describe ONE illustration concept. Text is never drawn inside the image.">
              <Textarea id="brief" rows={2} value={draft.visualBrief} onChange={(e) => set("visualBrief", e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Aadhi's role" htmlFor="role">
                <Input id="role" value={draft.aadhiRole} onChange={(e) => set("aadhiRole", e.target.value)} />
              </Field>
              <Field label="Placement" htmlFor="placement">
                <Select id="placement" value={draft.aadhiPlacement} onChange={(e) => set("aadhiPlacement", e.target.value)}>
                  {["beside-visual", "inside-visual", "bottom-corner", "pointing-at-title"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Pose" htmlFor="pose">
                <Input id="pose" value={draft.aadhiPose} onChange={(e) => set("aadhiPose", e.target.value)} />
              </Field>
              <Field label="Expression" htmlFor="expression">
                <Input id="expression" value={draft.aadhiExpression} onChange={(e) => set("aadhiExpression", e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card title="Actions">
          <div className="flex flex-col gap-2">
            <Button onClick={() => save(false)} disabled={saving}>
              {saving ? "Saving…" : "Save draft"}
            </Button>
            <Button variant="secondary" onClick={() => save(true)} disabled={saving}>
              Save & approve for visuals
            </Button>
            {regenJobId ? (
              <JobProgress
                jobId={regenJobId}
                label="page regeneration"
                onDone={async () => {
                  setRegenJobId(null);
                  await onChanged();
                }}
              />
            ) : (
              <Button variant="secondary" onClick={regenerate}>
                Regenerate this page only
              </Button>
            )}
            <p className="text-xs text-slate-500">
              Regeneration rewrites both levels of this page from its own source
              chunks and clears approval. Other pages are untouched.
            </p>
          </div>
        </Card>

        <Card title="Version history">
          {variant.versions?.length ? (
            <ul className="flex max-h-72 flex-col gap-1 overflow-auto">
              {variant.versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1 text-xs">
                  <span>
                    <span className="font-medium">{v.note}</span>
                    <br />
                    <span className="text-slate-500">{new Date(v.createdAt).toLocaleString()}</span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => restoreVersion(v.id)}>
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No versions yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
