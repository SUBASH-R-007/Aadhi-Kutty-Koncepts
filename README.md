# Aadhi Learning Studio

AI-assisted educational content creation platform for **Aadhi Kutty Koncepts**.
A subject-matter expert uploads learning material, generates **novice** and
**advanced** page-by-page content with OpenAI or Gemini, reviews and edits every
page, uploads a branded template with safe zones, generates per-page
illustrations featuring the college mascot **Aadhi** (an anthropomorphic
blackbuck with a strictly enforced character bible), composes polished final
pages with deterministic typography, and exports novice/advanced/both as PDF.

## Quick start

Prerequisites: **Node 20+**, **Docker** (for local PostgreSQL).

```bash
cp .env.example .env          # defaults work out of the box
npm install
npm run db:up                 # starts PostgreSQL 16 on port 5433 (docker compose)
npm run db:migrate            # prisma migrate dev (also runs the seed)
npm run dev                   # http://localhost:3000
```

No API keys are required to try the full workflow: the **mock** text and image
providers are deterministic and keyless. To use real providers, set
`OPENAI_API_KEY` and/or `GEMINI_API_KEY` in `.env` and pick the provider when
creating a project.

### Checks

```bash
npm run typecheck   # strict TypeScript
npm run lint        # ESLint
npm test            # Vitest unit tests (18 tests, no DB needed)
npm run test:e2e    # Playwright full-workflow smoke test (needs DB + dev server)
npm run build       # production build
```

## The workflow

1. **Create a project** — name, subject, audience, goals, tone, page count,
   aspect ratio (16:9 / 4:3 / A4 / square), college name, brand colors, and the
   text/image providers.
2. **Source** — paste text or upload TXT / Markdown / PDF / DOCX / PPTX.
   Extraction preserves provenance (PDF page numbers, Markdown/DOCX sections,
   PPTX slide numbers), shows the extracted text for review, lets you correct
   it (re-chunking automatically), and flags scanned/unreadable documents
   instead of inventing content.
3. **Content** — the provider plans pages from chunk previews, then writes each
   page **only from its assigned chunks** (large documents are never sent
   whole). Every page gets a novice and an advanced variant with title,
   objective, content blocks, key takeaway, example/activity, glossary,
   source references (validated against real chunk refs — fabricated citations
   are dropped), a visual brief, and Aadhi's role/pose/expression/placement.
   The editor has a page navigator, novice/advanced toggle, text-overflow
   estimation against the template zones, save status, version history with
   restore, and **regenerate-this-page-only**.
4. **Template** — upload a PNG/JPEG/SVG background (or use the default layout),
   then drag/resize the nine safe zones (title, body, visual, Aadhi, logo,
   header, footer, page number, source note). Saving zones creates a **new
   template version**; templates are reusable across projects.
5. **Visuals** — for **approved** pages only: the illustration brief combines
   the approved content, character bible, selected creative-context version,
   brand settings, and admin-editable negative constraints. The image model
   never draws instructional text; the deterministic renderer (SVG + Sharp
   behind a `PageRenderer` interface) typesets the approved text over the
   template and illustration. Generate all pages or one, override Aadhi's pose
   or the style per page, lock a good visual, compare versions, restore any
   version.
6. **Export** — novice, advanced, or both as PDF. Pages without a generated
   visual are composed deterministically from approved text so exports always
   succeed.

## Aadhi character system

- `docs/aadhi-character-bible.md` seeds the structured **Character Bible**
  (species, personality, uniform, palette, proportions, horn rules, markings,
  style, poses, expressions, accessories, forbidden changes, clear-space
  rules). Edit it in **Settings** — each save is a new version.
- Upload approved **reference images** in Settings; they are attached to every
  OpenAI image request (`images/edits` reference conditioning). The mock
  provider ignores them.
- Default negative constraints (no extra horns/limbs, no accidental text, no
  watermarks, no clothing changes, exactly one mascot, …) are editable by an
  administrator in Settings.

## “Context from our previous chats”

The app **cannot and does not** read private ChatGPT/Claude/Gemini history.
Instead, **Settings → Creative Contexts** lets you paste conversation text or
upload an exported chat (TXT/Markdown/JSON) or a creative brief, extracts a
structured `CreativeContext` record (visual style, brand, Aadhi rules, page
rules, approved prompt fragments), shows it for **review and editing before
saving**, and versions every save. Each project selects which context version
its generation jobs use (Visuals page). `docs/creative-context.md` seeds
version 1 at `npm run db:seed`.

## Architecture

- **Next.js 15 (App Router) + TypeScript strict + Tailwind CSS 4**
- **PostgreSQL + Prisma 6** (versioned content, templates, visuals, contexts)
- **Zod** everywhere untrusted data enters (API bodies, provider JSON, env)
- Swappable infrastructure behind interfaces:
  - `TextProvider` (`src/lib/providers/text`): OpenAI, Gemini, Mock
  - `ImageProvider` (`src/lib/providers/image`): OpenAI (`images/generations` +
    `images/edits` for reference conditioning), Mock
  - `ObjectStorage` (`src/lib/storage`): local disk (dev, served via
    `/api/assets`), S3-compatible (AWS/MinIO/R2)
  - `JobQueue` (`src/lib/queue`): in-process dev queue persisting jobs to the
    DB; a Redis/BullMQ driver can be added without touching call sites
  - `PageRenderer` (`src/lib/render`): SVG + Sharp compositor; a
    Playwright/HTML renderer can be swapped in
- Model names are **configuration, not code**: env defaults
  (`OPENAI_TEXT_MODEL`, `GEMINI_TEXT_MODEL`, `OPENAI_IMAGE_MODEL`) with runtime
  admin overrides in **Settings** (stored in `AppConfig`).

## Security posture

- API keys are read server-side from env only and are never sent to the browser.
- Uploaded learning material is treated as **untrusted data**: prompts wrap it
  in `<source_material>` tags with explicit do-not-follow-instructions guards
  (unit-tested), and cited source refs are validated against the real chunk
  list so citations cannot be fabricated.
- Storage keys are sanitized against path traversal; uploads are type- and
  size-limited (25 MB).

## Assumptions made (MVP)

- **No authentication** — single-team internal tool for now. Add NextAuth or
  similar before any public deployment.
- **PDF backgrounds for templates** are not yet supported (PNG/JPEG/SVG are);
  the API returns a clear message and an adapter slot exists.
- **PPTX extraction** reads slide shape text (not speaker notes).
- The in-process queue runs inside the Next.js server process — fine for
  dev/small deployments; swap in a Redis driver for horizontal scale.
- The renderer uses Arial/Helvetica system fonts for deterministic typography.
- Local Postgres runs on **port 5433** to avoid clashing with an existing
  installation.
- The repo had no commits at project start; the `.git` directory was recreated
  during scaffolding, so the `origin` remote must be re-added:
  `git remote add origin <your-github-url>`.

## Project structure

```
prisma/schema.prisma        data model (projects, sources, chunks, pages,
                            variants + versions, templates, visuals, jobs,
                            character bible, creative contexts, exports)
src/lib/extraction/         txt/md/pdf/docx/pptx extraction + chunking
src/lib/providers/text/     OpenAI / Gemini / mock text adapters + prompts
src/lib/providers/image/    OpenAI / mock image adapters
src/lib/generation/         outline + per-page generation pipeline
src/lib/visuals/            illustration brief builder + visual pipeline
src/lib/render/             deterministic SVG+Sharp page renderer + text layout
src/lib/export/             PDF assembly (pdf-lib)
src/lib/queue/              job queue abstraction (in-process driver)
src/lib/storage/            object storage abstraction (local / S3)
src/app/api/                REST route handlers (thin, zod-validated)
src/app/…                   dashboard, wizard, source, editor, template,
                            visuals, export, settings pages
e2e/smoke.spec.ts           Playwright full-workflow test (mock providers)
docs/                       seed docs: character bible & creative context
```
