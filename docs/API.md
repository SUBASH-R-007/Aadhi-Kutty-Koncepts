# API Reference

All routes live under `src/app/api/**`. Handlers are thin and Zod-validated;
errors return `{ "error": string }` with an appropriate status (400 validation,
404 not found, 500 otherwise). Long-running work returns a `{ jobId }` — poll
`GET /api/jobs/:id`.

## Projects

| Method | Path | Body / notes | Returns |
|---|---|---|---|
| `GET` | `/api/projects` | — | projects with `_count` of pages/sources |
| `POST` | `/api/projects` | project fields (name, subject, audience, …, `textProvider`, `imageProvider`, `brandColors[]`) | created project |
| `GET` | `/api/projects/:id` | — | full project (template, creativeContext, sources+chunks, pages+variants+visuals, exports) |
| `PATCH` | `/api/projects/:id` | any subset of editable fields incl. `templateId`, `creativeContextId` | updated project |
| `DELETE` | `/api/projects/:id` | — | `{ ok: true }` |
| `POST` | `/api/projects/:id/logo` | multipart `file` (PNG/JPEG/SVG) | project with `logoAssetKey` |
| `DELETE` | `/api/projects/:id/logo` | — | project (logo cleared) |

## Source material

| Method | Path | Body / notes | Returns |
|---|---|---|---|
| `POST` | `/api/projects/:id/sources` | multipart `file` (TXT/MD/PDF/DOCX/PPTX, ≤25 MB) **or** JSON `{ text, label }` | `SourceDocument` + chunks |
| `PATCH` | `/api/sources/:id` | `{ extractedText }` — user correction, re-chunks | updated source |
| `DELETE` | `/api/sources/:id` | — | `{ ok: true }` |

## Content generation & editing

| Method | Path | Body / notes | Returns |
|---|---|---|---|
| `POST` | `/api/projects/:id/generate` | — starts full novice+advanced generation | `{ jobId }` |
| `GET` | `/api/pages/:id` | — | page with variants (+versions) and visuals |
| `PATCH` | `/api/pages/:id` | `{ visualLocked?, activeVisualId? }` — lock or restore a visual version | updated page |
| `PATCH` | `/api/pages/:id/variants/:level` | `{ content, approve, note }` — save (and optionally approve) a variant; every save is versioned | updated variant + versions |
| `POST` | `/api/pages/:id/regenerate` | — regenerate this page's content only | `{ jobId }` |
| `POST` | `/api/versions/:id/restore` | — restore a variant version (clears approval) | updated variant |

`:level` is `novice` or `advanced`. `content` must match
`pageVariantContentSchema` (title, whyLearn, blocks, callouts, keyTakeaway,
exampleActivity, glossary, knowledgeCheck, sourceRefs, visual plan…).

## Visuals

| Method | Path | Body / notes | Returns |
|---|---|---|---|
| `POST` | `/api/pages/:id/visual` | `{ level, poseOverride?, styleOverride?, extraInstructions? }` — approved, unlocked pages only | `{ jobId }` |
| `POST` | `/api/projects/:id/visuals` | `{ level }` — batch: one job per approved, unlocked page | `{ jobIds[], skipped }` |

The `generate-visual` job's `result` includes `provider`, `referencesAttached`,
and `referencesAvailable` so you can confirm the Aadhi reference images were
sent.

## Templates

| Method | Path | Body / notes | Returns |
|---|---|---|---|
| `GET` | `/api/templates` | — | all templates |
| `POST` | `/api/templates` | multipart `name, width, height`, optional `file` (PNG/JPEG/SVG), optional `zones` JSON | created template |
| `PATCH` | `/api/templates/:id` | `{ zones, projectId? }` — saves a **new version** and optionally repoints the project | new template version |

## Creative contexts

| Method | Path | Body / notes | Returns |
|---|---|---|---|
| `GET` | `/api/creative-contexts` | — | all contexts (name, version) |
| `POST` | `/api/creative-contexts` | `{ action: "extract", raw, name, provider }` → `{ draft, warning, provider }`; or `{ action: "save", data }` → new version | see notes |

## Character bible & Aadhi references

| Method | Path | Body / notes | Returns |
|---|---|---|---|
| `GET` | `/api/character-bible` | — | `{ version, data, references[] }` |
| `PATCH` | `/api/character-bible` | full `characterBibleSchema` — saves a new version | new bible |
| `POST` | `/api/character-bible/references` | multipart `file` (PNG/JPEG), optional `notes` | created `AadhiReference` |
| `DELETE` | `/api/character-bible/references/:id` | — | `{ ok: true }` |

## Export, jobs, config, assets

| Method | Path | Body / notes | Returns |
|---|---|---|---|
| `POST` | `/api/projects/:id/export` | `{ levels: novice\|advanced\|both }` | `{ jobId }` |
| `GET` | `/api/projects/:id/export` | — | export artifacts |
| `GET` | `/api/jobs/:id` | — | job status/progress/result |
| `GET` | `/api/config` | — | `{ config, providers }` (which keys are present) |
| `PATCH` | `/api/config` | partial config (model names, `negativeConstraints[]`) | updated config |
| `GET` | `/api/assets/:...key` | — | the stored asset bytes (uploads, illustrations, composed pages, exports) |
