"use client";

import { use, useCallback, useEffect, useState } from "react";
import { del, getJSON, patchJSON, upload } from "@/lib/clientApi";
import type { ProjectDto, TemplateDto } from "@/lib/uiTypes";
import type { Zones } from "@/lib/content/schemas";
import { defaultZones } from "@/lib/templates";
import { assetUrl } from "@/lib/uiTypes";
import { Badge, Button, Card, ErrorNote, Field, Input, Select, Spinner } from "@/components/ui";
import { ZoneEditor } from "@/components/ZoneEditor";

export default function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [zones, setZones] = useState<Zones | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("College template");
  const [file, setFile] = useState<File | null>(null);

  const reload = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([
        getJSON<ProjectDto>(`/api/projects/${id}`),
        getJSON<TemplateDto[]>(`/api/templates`),
      ]);
      setProject(p);
      setTemplates(t);
      setZones(p.template?.zones ?? defaultZones(p.pageWidth, p.pageHeight));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!project || !zones) return <Spinner label="Loading template…" />;

  async function createTemplate() {
    if (!project) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("name", name);
      form.set("width", String(project.pageWidth));
      form.set("height", String(project.pageHeight));
      if (file) form.set("file", file);
      const created = await upload<TemplateDto>(`/api/templates`, form);
      await patchJSON(`/api/projects/${id}`, { templateId: created.id });
      setFile(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Template upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function selectTemplate(templateId: string) {
    setError(null);
    try {
      await patchJSON(`/api/projects/${id}`, { templateId: templateId || null });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not select template");
    }
  }

  async function uploadLogo(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      await upload(`/api/projects/${id}/logo`, form);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Logo upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeLogo() {
    setError(null);
    try {
      await del(`/api/projects/${id}/logo`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove logo");
    }
  }

  async function saveZones() {
    if (!project?.template) return;
    setBusy(true);
    setError(null);
    try {
      await patchJSON(`/api/templates/${project.template.id}`, {
        zones,
        projectId: id,
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save zones");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorNote message={error} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Upload a new template">
          <div className="flex flex-col gap-3">
            <Field label="Template name" htmlFor="tname">
              <Input id="tname" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field
              label="Background image (PNG / JPEG / SVG, optional)"
              htmlFor="tfile"
              hint={`Will be stretched to ${project.pageWidth}×${project.pageHeight}. PDF-page backgrounds arrive via a future adapter. Leave empty for a plain branded background.`}
            >
              <input
                id="tfile"
                type="file"
                accept=".png,.jpg,.jpeg,.svg"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            <Button onClick={createTemplate} disabled={busy}>
              {busy ? "Uploading…" : "Create template & use in this project"}
            </Button>
          </div>
        </Card>

        <Card title="Or reuse an existing template">
          <Field label="Template (versioned, reusable across projects)" htmlFor="tsel">
            <Select
              id="tsel"
              value={project.templateId ?? ""}
              onChange={(e) => selectTemplate(e.target.value)}
            >
              <option value="">— Default layout (no template) —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} v{t.version} ({t.width}×{t.height})
                </option>
              ))}
            </Select>
          </Field>
          {project.template && (
            <p className="mt-2 text-xs text-slate-500">
              Active: <strong>{project.template.name} v{project.template.version}</strong>. Saving
              zone changes creates a new version and repoints this project.
            </p>
          )}
        </Card>
      </div>

      <Card title="College logo">
        <p className="mb-2 text-sm text-slate-600">
          PNG / JPEG / SVG. Composited deterministically into the template&apos;s{" "}
          <strong>logo</strong> safe zone on every page (never redrawn by the image model).
        </p>
        <div className="flex items-center gap-4">
          {project.logoAssetKey ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(project.logoAssetKey)}
                alt="College logo"
                className="h-16 rounded border border-slate-200 bg-white object-contain p-1"
              />
              <Button size="sm" variant="danger" onClick={removeLogo}>
                Remove logo
              </Button>
            </>
          ) : (
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              aria-label="Upload college logo"
              className="block text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadLogo(file);
                e.target.value = "";
              }}
            />
          )}
        </div>
      </Card>

      <Card
        title="Safe zones"
        actions={
          project.template ? (
            <Button size="sm" onClick={saveZones} disabled={busy}>
              {busy ? "Saving…" : "Save zones (new version)"}
            </Button>
          ) : (
            <Badge tone="amber">Create/select a template to save zones</Badge>
          )
        }
      >
        <ZoneEditor
          zones={zones}
          onChange={setZones}
          width={project.pageWidth}
          height={project.pageHeight}
          backgroundUrl={project.template?.assetKey ? assetUrl(project.template.assetKey) : null}
        />
      </Card>
    </div>
  );
}
