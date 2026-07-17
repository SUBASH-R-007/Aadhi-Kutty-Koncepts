# Data Model

Defined in `prisma/schema.prisma` (PostgreSQL + Prisma 6). JSON columns hold
Zod-validated shapes from `src/lib/content/schemas.ts` and friends.

## Entity map

```
Project ─┬─< SourceDocument ─< SourceChunk
         ├─< Page ─┬─< PageVariant ─< PageVariantVersion
         │         └─< PageVisual
         ├─< GenerationJob
         ├─< ExportArtifact
         ├──> Template            (many projects → one template version)
         └──> CreativeContext     (many projects → one context version)

CharacterBible   (global, versioned)      AadhiReference (global)
AppConfig        (global admin settings)
```

## Models

### `Project`
The top-level unit. Holds brand + provider settings and output format.
- `subject, audience, learningGoals, tone, targetPageCount, aspectRatio,
  pageWidth, pageHeight` — the brief and output geometry.
- `collegeName, logoAssetKey, brandColors (Json string[])` — branding. The logo
  is composited into the template's logo zone.
- `textProvider` (`openai | gemini | mock`), `imageProvider`
  (`openai | gemini | mock`), `imageStyle` — generation config.
- `templateId?`, `creativeContextId?` — the selected (versioned) template and
  creative context.
- `status` — `draft → content → exported` (informational).

### `SourceDocument` / `SourceChunk`
Uploaded or pasted material.
- `SourceDocument`: `filename, kind (paste|txt|md|pdf|docx|pptx), status
  (extracted|unreadable), warning?, rawAssetKey?, extractedText`. Scanned /
  empty documents are flagged `unreadable` and skipped by generation.
- `SourceChunk`: retrieval-sized piece with `index, text, sourceRef, charCount`.
  `sourceRef` preserves provenance — e.g. `notes.pdf p.3`,
  `slides.pptx slide 5`, `doc.md — Section: Osmosis`.

### `Page`
A canonical page shared by both reading levels.
- `index`, `chunkIds (Json string[])` — the chunks this page was built from,
  enabling single-page regeneration.
- `visualLocked`, `activeVisualId?` — lock a good visual; point at the chosen
  version.

### `PageVariant` (unique per `[pageId, level]`)
The editable content for one level (`novice | advanced`):
- Text: `title, learningObjective, whyLearn, keyTakeaway, exampleActivity`.
- JSON: `blocks [{heading?, body}]`, `callouts [{type, body}]`,
  `glossary [{term, definition}]`, `knowledgeCheck [{question, answer, kind}]`,
  `sourceRefs string[]`.
- Visual plan: `visualBrief, aadhiRole, aadhiPose, aadhiExpression,
  aadhiPlacement`.
- `insufficientSource` — set when the model flags the source as too thin.
- `approvedAt?` — **must be non-null before a visual can be generated**;
  cleared on regeneration/restore.

### `PageVariantVersion`
Immutable snapshot of a variant, written on every save/generate/restore
(`snapshot Json`, `note`). Powers version history + restore.

### `Template`
Versioned, reusable across projects.
- `name, version, assetKey? (background), width, height`.
- `zones Json` — normalized (0..1) safe zones keyed by:
  `title, body, visual, aadhi, logo, header, footer, pageNumber, sourceNote`.
- Saving zones creates a **new version row** (same name/background) so projects
  on older versions are unaffected.

### `CreativeContext`
Structured creative direction imported from prior-chat text or a brief. Unique
per `[name, version]`; `data Json` matches `creativeContextSchema`
(visual style, brand, Aadhi rules, page rules, approved prompt fragments,
notes). Projects select which version their generation jobs use.

### `CharacterBible` (global, versioned)
`version, data Json` matching `characterBibleSchema` — Aadhi's canon
(personality, clothing, palette, proportions, horns, markings, style, poses,
expressions, accessories, forbidden changes, clear-space rules). Editing in
Settings creates a new version; the latest is used at generation time.

### `AadhiReference` (global)
Approved reference images: `assetKey, filename, notes`. Attached to every real
image request (OpenAI/Gemini) for mascot conditioning.

### `PageVisual`
One generated visual version for a page: `version, level, prompt,
illustrationAssetKey?, composedAssetKey?, status
(pending|generating|complete|failed), error?`. Compare/restore across versions.

### `GenerationJob`
Background-job record: `type, payload Json, status
(queued|running|complete|failed), progress, message, result Json?, error?`.
The UI polls this. `result` for `generate-visual` includes `referencesAttached`,
`referencesAvailable`, and `provider`.

### `ExportArtifact`
A produced export: `levels (novice|advanced|both), format (pdf), assetKey`.

### `AppConfig`
Global admin settings (`key, value Json`). The `app` row holds model-name
overrides and the editable negative-constraints list.

## Notes on versioning

Content, templates, the character bible, creative contexts, and page visuals are
all versioned. Regenerating content or restoring a version **clears the
variant's approval**, so a visual is never produced from unreviewed text.
