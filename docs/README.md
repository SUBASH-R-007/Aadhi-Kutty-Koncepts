# Aadhi Learning Studio — Documentation

AI-assisted educational content creation platform for **Aadhi Kutty Koncepts /
Rajalakshmi Engineering College**. A subject-matter expert turns source
material into **novice** and **advanced**, page-by-page illustrated learning
content starring the college mascot **Aadhi**, then exports it as PDF.

This folder is the project's documentation. Start with whichever fits your task:

| Doc | What it covers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, the swappable interfaces (providers, storage, queue, renderer), the generation & visual pipelines, and the security model. |
| [DATA_MODEL.md](DATA_MODEL.md) | Every Prisma model and how they relate; the content shape (why-learn, callouts, knowledge check); versioning. |
| [API.md](API.md) | Every REST endpoint: method, path, body, response. |
| [OPERATIONS.md](OPERATIONS.md) | Setup, running (Docker **or** no-Docker embedded Postgres), providers & API keys, troubleshooting (billing limits, DB blips), and how the assets in `brand/` were wired in. |
| [aadhi-character-bible.md](aadhi-character-bible.md) | The canonical Aadhi character definition (the app's DB copy is the source of truth at generation time). |
| [creative-context.md](creative-context.md) | The "context from previous chats" feature and its seed values. |

The root [../README.md](../README.md) is the quick-start; this folder is the
depth.

## The product in one paragraph

Create a project (subject, audience, brand, providers) → upload/paste source
material (TXT/MD/PDF/DOCX/PPTX, extracted with page/slide/section provenance) →
generate **novice + advanced** content for each page (shaped after the
`basic-level-illustrated` and `advanced-level-illustrated` skills: why-learn,
concept blocks, callouts, key takeaway, apply-it, and a knowledge check) →
review and approve every page in the editor → upload a branded template with
safe zones and the college logo → generate a per-page illustration featuring
Aadhi (image provider **OpenAI or Gemini**, conditioned on approved Aadhi
reference images) → the deterministic renderer typesets the approved text and
composites logo + illustration into a final page → export novice / advanced /
both as PDF. Individual pages regenerate without touching the rest.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript strict** + **Tailwind CSS 4**
- **PostgreSQL** + **Prisma 6**
- **Zod** for all runtime validation
- **Sharp** (image compositing) + **pdf-lib** (PDF export)
- **pdf-parse / mammoth / jszip** (PDF / DOCX / PPTX extraction)
- **Vitest** (unit) + **Playwright** (e2e)
- Providers, storage, queue, and the renderer all sit behind interfaces so they
  can be swapped without touching call sites.

## Key design commitments

1. **API keys never reach the browser** — providers run server-side only.
2. **Uploaded material is untrusted data** — wrapped in `<source_material>`
   tags with anti-injection guards; cited sources are validated against real
   chunks so citations can't be fabricated.
3. **Model names are configuration, not code** — env defaults + admin overrides.
4. **The image model never draws instructional text** — a deterministic
   renderer typesets all text; the model only produces the illustration.
5. **Everything meaningful is versioned** — page variants, templates, character
   bible, creative contexts, and page visuals.
