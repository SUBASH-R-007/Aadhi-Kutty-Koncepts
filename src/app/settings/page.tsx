"use client";

import { useCallback, useEffect, useState } from "react";
import { del, getJSON, patchJSON, postJSON, upload } from "@/lib/clientApi";
import type { CreativeContextDto } from "@/lib/uiTypes";
import { assetUrl } from "@/lib/uiTypes";
import type { CharacterBibleData } from "@/lib/characterBible";
import { Badge, Button, Card, ErrorNote, Field, Input, Spinner, Textarea, WarningNote } from "@/components/ui";

type ConfigResponse = {
  config: {
    openaiTextModel: string;
    geminiTextModel: string;
    openaiImageModel: string;
    negativeConstraints: string[];
  };
  providers: {
    openaiTextAvailable: boolean;
    geminiTextAvailable: boolean;
    openaiImageAvailable: boolean;
  };
};

type BibleResponse = {
  version: number;
  data: CharacterBibleData;
  references: { id: string; assetKey: string; filename: string; notes: string }[];
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ModelsCard />
      <CharacterBibleCard />
      <CreativeContextsCard />
    </div>
  );
}

function ModelsCard() {
  const [data, setData] = useState<ConfigResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getJSON<ConfigResponse>("/api/config").then(setData).catch((e) => setError(e.message));
  }, []);

  if (!data) return <Spinner label="Loading configuration…" />;
  const { config, providers } = data;

  async function save() {
    if (!data) return;
    setError(null);
    setSaved(false);
    try {
      await patchJSON("/api/config", data.config);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  const set = (key: keyof ConfigResponse["config"], value: string | string[]) =>
    setData((d) => (d ? { ...d, config: { ...d.config, [key]: value } } : d));

  return (
    <Card
      title="Models & negative constraints (admin)"
      actions={<Button size="sm" onClick={save}>Save</Button>}
    >
      <ErrorNote message={error} />
      {saved && <p className="mb-2 text-xs text-green-700">Saved.</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="OpenAI text model" htmlFor="otm" hint={providers.openaiTextAvailable ? "key configured" : "no OPENAI_API_KEY — mock fallback"}>
          <Input id="otm" value={config.openaiTextModel} onChange={(e) => set("openaiTextModel", e.target.value)} />
        </Field>
        <Field label="Gemini text model" htmlFor="gtm" hint={providers.geminiTextAvailable ? "key configured" : "no GEMINI_API_KEY — mock fallback"}>
          <Input id="gtm" value={config.geminiTextModel} onChange={(e) => set("geminiTextModel", e.target.value)} />
        </Field>
        <Field label="OpenAI image model" htmlFor="oim" hint={providers.openaiImageAvailable ? "key configured" : "no OPENAI_API_KEY — mock fallback"}>
          <Input id="oim" value={config.openaiImageModel} onChange={(e) => set("openaiImageModel", e.target.value)} />
        </Field>
      </div>
      <div className="mt-3">
        <Field
          label="Default visual negative constraints (one per line)"
          htmlFor="neg"
          hint="Applied as hard constraints to every image generation."
        >
          <Textarea
            id="neg"
            rows={8}
            value={config.negativeConstraints.join("\n")}
            onChange={(e) => set("negativeConstraints", e.target.value.split("\n").filter((l) => l.trim()))}
          />
        </Field>
      </div>
    </Card>
  );
}

const bibleFields: { key: keyof CharacterBibleData; label: string; list?: boolean }[] = [
  { key: "personality", label: "Personality" },
  { key: "clothing", label: "Default clothing / college uniform" },
  { key: "colorPalette", label: "Color palette (one hex per line)", list: true },
  { key: "proportions", label: "Body proportions" },
  { key: "horns", label: "Horn shape & symmetry" },
  { key: "faceAndEyes", label: "Face & eye style" },
  { key: "markings", label: "Black-and-white markings" },
  { key: "illustrationStyle", label: "Illustration style" },
  { key: "commonPoses", label: "Common poses (one per line)", list: true },
  { key: "commonExpressions", label: "Common expressions (one per line)", list: true },
  { key: "approvedAccessories", label: "Approved accessories (one per line)", list: true },
  { key: "forbiddenChanges", label: "Forbidden changes (one per line)", list: true },
  { key: "clearSpaceRules", label: "Logo & mascot clear-space rules" },
];

function CharacterBibleCard() {
  const [bible, setBible] = useState<BibleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    return getJSON<BibleResponse>("/api/character-bible").then(setBible).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!bible) return <Spinner label="Loading character bible…" />;

  async function save() {
    if (!bible) return;
    setError(null);
    setSaved(false);
    try {
      await patchJSON("/api/character-bible", bible.data);
      setSaved(true);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function uploadReference(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      await upload("/api/character-bible/references", form);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title={`Aadhi Character Bible (v${bible.version})`}
      actions={<Button size="sm" onClick={save}>Save as new version</Button>}
    >
      <ErrorNote message={error} />
      {saved && <p className="mb-2 text-xs text-green-700">Saved a new version.</p>}
      <p className="mb-3 text-sm text-slate-600">
        Name: <strong>{bible.data.name}</strong> · Species: <strong>{bible.data.species}</strong>.
        This bible plus the reference images below are attached to every image
        generation request so Aadhi stays consistent on every page.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {bibleFields.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`bible-${f.key}`}>
            <Textarea
              id={`bible-${f.key}`}
              rows={f.list ? 4 : 2}
              value={
                f.list
                  ? (bible.data[f.key] as string[]).join("\n")
                  : (bible.data[f.key] as string)
              }
              onChange={(e) =>
                setBible((b) =>
                  b
                    ? {
                        ...b,
                        data: {
                          ...b.data,
                          [f.key]: f.list
                            ? e.target.value.split("\n").filter((l) => l.trim())
                            : e.target.value,
                        },
                      }
                    : b,
                )
              }
            />
          </Field>
        ))}
      </div>

      <h3 className="mb-2 mt-4 text-sm font-semibold">Approved reference images</h3>
      <p className="mb-2 text-xs text-slate-500">
        PNG/JPEG. Sent as reference-image conditioning to providers that support
        it (OpenAI images does; the mock provider ignores them).
      </p>
      <input
        type="file"
        accept=".png,.jpg,.jpeg"
        aria-label="Upload Aadhi reference image"
        className="block text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadReference(file);
          e.target.value = "";
        }}
      />
      {busy && <Spinner label="Uploading…" />}
      <ul className="mt-3 flex flex-wrap gap-3">
        {bible.references.map((r) => (
          <li key={r.id} className="w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl(r.assetKey)} alt={`Aadhi reference: ${r.filename}`} className="h-32 w-32 rounded border border-slate-200 object-cover" />
            <div className="mt-1 flex items-center justify-between">
              <span className="truncate text-xs text-slate-500" title={r.filename}>{r.filename}</span>
              <button
                className="text-xs text-red-600 hover:underline"
                onClick={async () => {
                  await del(`/api/character-bible/references/${r.id}`);
                  await reload();
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CreativeContextsCard() {
  const [contexts, setContexts] = useState<CreativeContextDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [name, setName] = useState("Imported chat context");
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    return getJSON<CreativeContextDto[]>("/api/creative-contexts").then(setContexts).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function extract() {
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const res = await postJSON<{ draft: unknown; warning: string | null }>("/api/creative-contexts", {
        action: "extract",
        raw,
        name,
        provider: "mock",
      });
      setWarning(res.warning);
      setDraft(JSON.stringify(res.draft, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const data = JSON.parse(draft);
      await postJSON("/api/creative-contexts", { action: "save", data });
      setDraft(null);
      setRaw("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed (is the JSON valid?)");
    } finally {
      setBusy(false);
    }
  }

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <Card title="Creative Contexts (imported prior-chat direction)">
      <ErrorNote message={error} />
      <WarningNote message={warning} />
      <p className="mb-3 text-sm text-slate-600">
        The app cannot read your private ChatGPT/Claude/Gemini history. Paste
        conversation text or upload an exported chat (TXT/Markdown/JSON) or a
        creative brief; review the extracted rules; then save it as a version.
        Each project selects which version its generation jobs use (Visuals page).
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Field label="Context name" htmlFor="ccname">
            <Input id="ccname" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Pasted conversation / brief" htmlFor="ccraw">
            <Textarea id="ccraw" rows={10} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste your previous chat about Aadhi's look and the visual style…" />
          </Field>
          <input
            type="file"
            accept=".txt,.md,.markdown,.json"
            aria-label="Upload exported chat file"
            className="block text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readFile(f);
              e.target.value = "";
            }}
          />
          <Button onClick={extract} disabled={busy || !raw.trim()}>
            {busy ? "Extracting…" : "Extract structured context"}
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {draft ? (
            <>
              <Field label="Review & edit the extracted rules (JSON)" htmlFor="ccdraft">
                <Textarea id="ccdraft" rows={14} value={draft} onChange={(e) => setDraft(e.target.value)} />
              </Field>
              <div className="flex gap-2">
                <Button onClick={saveDraft} disabled={busy}>
                  Save as new version
                </Button>
                <Button variant="secondary" onClick={() => setDraft(null)}>
                  Discard
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold">Saved versions</h3>
              {contexts.length === 0 ? (
                <p className="text-sm text-slate-500">None yet.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {contexts.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-sm">
                      <span>
                        {c.name} <Badge tone="indigo">v{c.version}</Badge>
                      </span>
                      <span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
