"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJSON } from "@/lib/clientApi";
import { Button, Card, ErrorNote, Field, Input, Select, Textarea } from "@/components/ui";

const aspects = [
  { value: "16:9", label: "16:9 landscape (slides)" },
  { value: "4:3", label: "4:3 (classic)" },
  { value: "A4", label: "A4 portrait (booklet)" },
  { value: "1:1", label: "Square (social)" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    audience: "First-year college students",
    learningGoals: "",
    tone: "friendly and encouraging",
    targetPageCount: 8,
    aspectRatio: "16:9",
    collegeName: "Rajalakshmi Engineering College",
    brandColorsText: "#5A277F, #F4A81D, #FAF7F2",
    textProvider: "mock",
    imageProvider: "mock",
    imageStyle: "flat vector educational illustration, soft shading, clean outlines",
  });

  const set = (key: keyof typeof form, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const brandColors = form.brandColorsText
        .split(",")
        .map((c) => c.trim())
        .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
      const project = await postJSON<{ id: string }>("/api/projects", {
        name: form.name,
        subject: form.subject,
        audience: form.audience,
        learningGoals: form.learningGoals,
        tone: form.tone,
        targetPageCount: Number(form.targetPageCount),
        aspectRatio: form.aspectRatio,
        collegeName: form.collegeName,
        brandColors,
        textProvider: form.textProvider,
        imageProvider: form.imageProvider,
        imageStyle: form.imageStyle,
      });
      router.push(`/projects/${project.id}/source`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-2xl font-bold">New project</h1>
      <ErrorNote message={error} />
      <Card title="Basics">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Project name" htmlFor="name">
            <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Photosynthesis booklet" />
          </Field>
          <Field label="Course / subject" htmlFor="subject">
            <Input id="subject" required value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Plant Biology 101" />
          </Field>
          <Field label="Target audience" htmlFor="audience">
            <Input id="audience" required value={form.audience} onChange={(e) => set("audience", e.target.value)} />
          </Field>
          <Field label="Preferred tone" htmlFor="tone">
            <Input id="tone" value={form.tone} onChange={(e) => set("tone", e.target.value)} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Learning goals" htmlFor="goals">
            <Textarea id="goals" rows={3} value={form.learningGoals} onChange={(e) => set("learningGoals", e.target.value)} placeholder="After reading, students can explain…" />
          </Field>
        </div>
      </Card>

      <Card title="Output format">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Approximate number of pages" htmlFor="pages">
            <Input id="pages" type="number" min={1} max={60} value={form.targetPageCount} onChange={(e) => set("targetPageCount", Number(e.target.value))} />
          </Field>
          <Field label="Aspect ratio / format" htmlFor="aspect">
            <Select id="aspect" value={form.aspectRatio} onChange={(e) => set("aspectRatio", e.target.value)}>
              {aspects.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card title="Branding">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="College name" htmlFor="college">
            <Input id="college" required value={form.collegeName} onChange={(e) => set("collegeName", e.target.value)} placeholder="Rajalakshmi Engineering College" />
          </Field>
          <Field label="Brand colors (hex, comma-separated)" htmlFor="colors" hint="Order: primary, accent, paper">
            <Input id="colors" value={form.brandColorsText} onChange={(e) => set("brandColorsText", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="AI providers">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Text generation provider" htmlFor="text-provider" hint="mock works without API keys">
            <Select id="text-provider" value={form.textProvider} onChange={(e) => set("textProvider", e.target.value)}>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="mock">Mock (no key needed)</option>
            </Select>
          </Field>
          <Field label="Image generation provider" htmlFor="image-provider" hint="Both send the Aadhi reference images for mascot conditioning">
            <Select id="image-provider" value={form.imageProvider} onChange={(e) => set("imageProvider", e.target.value)}>
              <option value="openai">OpenAI images</option>
              <option value="gemini">Gemini images</option>
              <option value="mock">Mock (no key needed)</option>
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Image style preset" htmlFor="image-style">
            <Input id="image-style" value={form.imageStyle} onChange={(e) => set("imageStyle", e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
