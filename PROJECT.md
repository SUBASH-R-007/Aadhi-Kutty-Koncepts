# Aadhi Learning Studio — Project Details & Features

An AI-assisted educational content creation platform for **Aadhi Kutty
Koncepts / Rajalakshmi Engineering College (REC)**. A subject-matter expert
turns raw source material into **novice** and **advanced**, page-by-page
illustrated learning content starring the college mascot **Aadhi** (an
anthropomorphic blackbuck), then exports it as polished PDF booklets.

---

## 1. What it does (in one paragraph)

Create a project → upload or paste source material (TXT / Markdown / PDF / DOCX /
PPTX, extracted with page/slide/section provenance) → generate **novice +
advanced** content for every page, shaped after the `basic-level-illustrated`
and `advanced-level-illustrated` teaching styles → review, edit, and approve
each page in an editor → upload a branded template with safe zones and the
college logo → generate a per-page illustration featuring Aadhi (image provider
**OpenAI or Gemini**, conditioned on approved Aadhi reference images) → a
deterministic renderer typesets the approved text and composites logo +
illustration into a final page → export **novice / advanced / both** as PDF.
Individual pages regenerate without touching the rest.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript (strict) |
| UI | Tailwind CSS 4, accessible in-house component kit |
| Database | PostgreSQL + Prisma 6 |
| Validation | Zod (every point untrusted data enters) |
| Imaging | Sharp (deterministic page compositing) |
| Export | pdf-lib (PDF assembly) |
| Extraction | pdf-parse (PDF), mammoth (DOCX), jszip (PPTX) |
| Storage | Local disk (dev) / S3-compatible — behind an interface |
| Jobs | In-process, DB-backed queue — behind an interface |
| Testing | Vitest (unit) + Playwright (e2e) |
| Tooling | ESLint, Prettier, embedded-postgres (no-Docker dev DB) |

Providers, storage, the job queue, and the renderer all sit behind interfaces,
so each can be swapped (e.g. Redis queue, Playwright renderer) without touching
call sites.

---

## 3. The workflow & features

### Step 1 — Create a project
Name, subject, target audience, learning goals, tone, approximate page count,
output format (**16:9 / 4:3 / A4 / square**), college name, brand colors, and the
preferred **text** and **image** providers. Brand defaults to REC purple/gold.

### Step 2 — Source material
- Paste text, or upload **TXT / Markdown / PDF / DOCX / PPTX** (≤ 25 MB).
- Extraction **preserves provenance**: PDF page numbers, Markdown/DOCX sections,
  PPTX slide numbers (e.g. `notes.pdf p.3`, `slides.pptx slide 5`).
- Extracted text is shown for review and **user correction** (re-chunks on save).
- **Scanned / unreadable documents are flagged**, never silently invented from.
- Large sources are **split into chunks** with source references preserved;
  generation only uses retrieved chunks — a whole document is never sent at once.

### Step 3 — Generate novice & advanced content
Each page gets two variants, matching the two illustrated-teaching tiers:

- **Novice** (basic tier): a one-line *Why are we learning this?*, 2–3 plain
  blocks, **one** everyday example, **Pro-Tip / Fun Fact / Wait-Why** callouts,
  glossary, key takeaway, and a **3–5 question recall Knowledge Check** with
  answers. No comparisons, statistics, or edge cases.
- **Advanced** (deeper tier): a fuller *Why are we studying this?*, mechanisms /
  trade-offs / caveats / edge cases, a scenario-based **"apply it"** prompt,
  **Key-Insight / Common-Pitfall / Exam-Tip** callouts, and an **application +
  challenge Knowledge Check**.

Both variants **preserve source meaning, cite only real chunk references
(fabricated citations are dropped), keep terminology consistent, and flag when
the source is insufficient** rather than inventing content.

### Step 4 — Review & edit (the editor)
Page navigator · novice/advanced toggle · editors for every field (title,
objective, why-learn, blocks, callouts, glossary, key takeaway, apply-it,
knowledge check, visual plan) · **text-overflow estimation** against the
template zones · save status · **version history with restore** ·
**regenerate-this-page-only**. A page must be **approved** before any visual can
be generated.

### Step 5 — Template & branding
- Upload a **PNG / JPEG / SVG** background (or use the built-in layout).
- Upload the **college logo** — composited into the logo safe zone on every page
  (never redrawn by the image model).
- **Drag/resize nine safe zones**: title, body, visual, Aadhi, logo, header,
  footer, page number, source note.
- Templates are **versioned and reusable** across projects; saving zones creates
  a new version.

### Step 6 — Generate visuals
For **approved** pages only, an illustration brief is assembled from the approved
content + character bible + selected creative-context version + brand + editable
negative constraints (+ optional per-page pose/style overrides), and sent to the
chosen **OpenAI or Gemini** image provider **with the approved Aadhi reference
images** for mascot conditioning.

The image model **never draws instructional text** — a deterministic renderer
(SVG + Sharp) typesets why-learn, blocks, colored callout boxes, key takeaway,
apply-it, and the knowledge check, and composites the template, illustration,
and logo into a final page. You can **generate all / one**, **override Aadhi's
pose or style per page**, **lock** a good visual, **compare versions**, and
**restore** any version. Each job reports **how many Aadhi reference images were
sent to the API**.

### Step 7 — Export
Export **novice, advanced, or both** as PDF. Pages without a generated visual are
composed deterministically from approved text, so an export always succeeds.

---

## 4. The Aadhi mascot system

- A structured, versioned **Character Bible** (species, personality, the
  **purple-and-gold REC varsity look** — purple letterman jacket, gold torch-"R"
  emblem, purple goggles — palette, proportions, ridged horns, markings,
  illustration style, poses, expressions, accessories, forbidden changes,
  clear-space rules). Editable in Settings.
- Upload **approved reference images**; they are attached to every real image
  request — **OpenAI** (`images/edits` reference conditioning) **and Gemini**
  (`generateContent` inline reference parts) — so Aadhi stays the same character
  on every page.
- **Editable negative constraints** (no extra horns/limbs, no accidental text,
  no watermarks, no clothing changes, exactly one mascot, …) applied to every
  image request.

## 5. "Context from previous chats" (done safely)

The app **cannot and does not** read private ChatGPT/Claude/Gemini history.
Instead, a **Creative Context** import lets you paste conversation text or upload
an exported chat (TXT/MD/JSON) or a brief; it extracts a structured record
(visual style, brand, Aadhi rules, page rules, approved prompt fragments) for
**review and editing before saving**, and **versions** every save. Each project
selects which context version its generation jobs use.

---

## 6. Design commitments

1. **API keys never reach the browser** — providers run server-side only.
2. **Uploaded material is untrusted data** — wrapped in `<source_material>` tags
   with anti-injection guards; cited sources validated against real chunks.
3. **Model names are configuration, not code** — env defaults + admin overrides
   in Settings (`OPENAI_TEXT_MODEL`, `GEMINI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL`,
   `GEMINI_IMAGE_MODEL`).
4. **The image model never renders instructional text** — deterministic
   typography does.
5. **Everything meaningful is versioned** — page variants, templates, character
   bible, creative contexts, and page visuals. Regenerating/restoring clears
   approval so visuals never come from unreviewed text.

---

## 7. Quick start

```bash
cp .env.example .env          # defaults work out of the box (mock providers, no keys)
npm install

# Start PostgreSQL on port 5433 — pick ONE:
npm run db:up                 # Docker
npm run db:local              # No Docker: embedded PostgreSQL (leave running)

npm run db:migrate            # apply schema
npm run db:seed               # seed Aadhi bible + default creative context
npm run dev                   # http://localhost:3000
```

No API keys are needed to try the whole workflow — the **mock** text and image
providers are deterministic. To use real generation, add `OPENAI_API_KEY` and/or
`GEMINI_API_KEY` to `.env` and pick that provider on the project.

**Checks:** `npm run typecheck` · `npm run lint` · `npm test` (18 unit tests) ·
`npm run test:e2e` (full-workflow Playwright) · `npm run build`.

---

## 8. Project layout

```
prisma/schema.prisma     data model (projects, sources, chunks, pages,
                         variants+versions, templates, visuals, jobs,
                         character bible, creative contexts, exports)
src/lib/extraction/      txt/md/pdf/docx/pptx extraction + chunking
src/lib/providers/text/  OpenAI / Gemini / mock text adapters + prompts
src/lib/providers/image/ OpenAI / Gemini / mock image adapters
src/lib/generation/      outline + per-page novice/advanced pipeline
src/lib/visuals/         illustration brief + visual pipeline
src/lib/render/          deterministic SVG+Sharp renderer + text layout
src/lib/export/          PDF assembly (pdf-lib)
src/lib/queue/ storage/  job queue + object storage abstractions
src/app/api/             REST route handlers (thin, Zod-validated)
src/app/…                dashboard, wizard, source, editor, template,
                         visuals, export, settings pages
brand/                   Aadhi hero reference + REC logo (wired into the app)
docs/                    full documentation (architecture, data model, API, ops)
e2e/smoke.spec.ts        Playwright full-workflow test (mock providers)
```

---

## 9. Assumptions (MVP)

- **No authentication** — single-team internal tool; add auth before public use.
- **PDF-page template backgrounds** not yet supported (PNG/JPEG/SVG are).
- **PPTX extraction** reads slide shape text (not speaker notes).
- In-process queue runs inside the Next server process — swap in Redis for scale.
- Renderer uses Arial/Helvetica system fonts for deterministic typography.
- Local Postgres runs on **port 5433** to avoid clashing with an existing install.

> For depth — architecture, full API reference, data model, and operations /
> troubleshooting — see the [`docs/`](docs/README.md) folder.
