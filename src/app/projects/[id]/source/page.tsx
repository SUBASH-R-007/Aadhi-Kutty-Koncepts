"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { del, getJSON, patchJSON, postJSON, upload } from "@/lib/clientApi";
import type { ProjectDto, SourceDto } from "@/lib/uiTypes";
import { Badge, Button, Card, ErrorNote, Spinner, Textarea, WarningNote } from "@/components/ui";
import { JobProgress } from "@/components/JobProgress";

export default function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [genJobId, setGenJobId] = useState<string | null>(null);

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

  async function submitPaste() {
    if (!pasteText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await postJSON(`/api/projects/${id}/sources`, { text: pasteText, label: "Pasted text" });
      setPasteText("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paste failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      await upload(`/api/projects/${id}/sources`, form);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setError(null);
    try {
      const { jobId } = await postJSON<{ jobId: string }>(`/api/projects/${id}/generate`, {});
      setGenJobId(jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start generation");
    }
  }

  if (!project) return <Spinner label="Loading sources…" />;
  const readableChunks = project.sources
    .filter((s) => s.status !== "unreadable")
    .reduce((n, s) => n + s.chunks.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <ErrorNote message={error} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Paste learning material">
          <Textarea
            rows={8}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste a script, lecture notes, or any source text…"
            aria-label="Pasted learning material"
          />
          <div className="mt-2 flex justify-end">
            <Button onClick={submitPaste} disabled={busy || !pasteText.trim()}>
              Add pasted text
            </Button>
          </div>
        </Card>

        <Card title="Upload a document">
          <p className="mb-2 text-sm text-slate-600">
            TXT, Markdown, PDF, DOCX, or PPTX (max 25 MB). Page and slide numbers
            are preserved as source references.
          </p>
          <input
            type="file"
            accept=".txt,.md,.markdown,.pdf,.docx,.pptx"
            aria-label="Upload source document"
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-purple-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-purple-800"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void submitFile(file);
              e.target.value = "";
            }}
          />
          {busy && <p className="mt-2"><Spinner label="Processing document…" /></p>}
        </Card>
      </div>

      {project.sources.map((source) => (
        <SourceCard key={source.id} source={source} onChanged={reload} />
      ))}

      <Card
        title="Generate novice + advanced content"
        actions={<Badge tone={readableChunks > 0 ? "green" : "amber"}>{readableChunks} chunk(s) ready</Badge>}
      >
        <p className="mb-3 text-sm text-slate-600">
          Review and correct the extracted text above first — generation only
          uses the retrieved chunks shown there, with their source references.
          Provider: <strong>{project.textProvider}</strong>.
        </p>
        {genJobId ? (
          <JobProgress
            jobId={genJobId}
            label="content generation"
            onDone={(job) => {
              if (job.status === "complete") router.push(`/projects/${id}/content`);
            }}
          />
        ) : (
          <Button onClick={generate} disabled={readableChunks === 0}>
            Generate page content
          </Button>
        )}
      </Card>
    </div>
  );
}

function SourceCard({ source, onChanged }: { source: SourceDto; onChanged: () => Promise<void> }) {
  const [text, setText] = useState(source.extractedText);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await patchJSON(`/api/sources/${source.id}`, { extractedText: text });
      setEditing(false);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await del(`/api/sources/${source.id}`);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {source.filename}
          <Badge tone="slate">{source.kind}</Badge>
          {source.status === "unreadable" ? (
            <Badge tone="red">unreadable</Badge>
          ) : (
            <Badge tone="green">{source.chunks.length} chunk(s)</Badge>
          )}
        </span>
      }
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Correct text"}
          </Button>
          <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
            Remove
          </Button>
        </div>
      }
    >
      <WarningNote message={source.warning} />
      <ErrorNote message={error} />
      {editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <Textarea
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={`Corrected text for ${source.filename}`}
          />
          <div className="flex justify-end">
            <Button onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save corrected text & re-chunk"}
            </Button>
          </div>
        </div>
      ) : (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-purple-700">
            Review extracted content ({source.extractedText.length.toLocaleString()} chars)
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">
            {source.extractedText || "(empty)"}
          </pre>
          <ul className="mt-2 flex flex-wrap gap-1">
            {source.chunks.map((c) => (
              <li key={c.id}>
                <Badge tone="indigo">
                  {c.sourceRef} · {c.charCount} chars
                </Badge>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
