# Creative Context (seed document)

“Get the image-generation context from our previous chats” is implemented as an
explicit **Creative Context import** feature — the application cannot and does
not read private ChatGPT / Claude / Gemini conversation history.

To bring prior-chat context in:

1. Open **Settings → Creative Contexts → Import**.
2. Paste conversation text, or upload an exported chat (TXT / Markdown / JSON)
   or an existing creative brief.
3. Review and edit the extracted structured rules before saving.
4. Each save creates a new immutable version; projects select which version
   their generation jobs use.

This file seeds Creative Context **v1** ("Studio default") at database seed
time. Edit context versions in the app, not here.

## Visual style

- Flat vector illustration, soft shading, clean outlines, generous whitespace.
- Warm, optimistic lighting; no harsh shadows.
- Composition: single clear focal concept per page; illustration supports the
  text, never competes with it.
- Forbidden styles: photorealism, 3D render, anime, grunge, horror, meme style.

## Brand

- College name comes from the project settings.
- Colors come from project brand colors; defaults #1F3A5F (navy), #E8A13D (gold), #FAF7F2 (paper).
- Fonts (deterministic text rendering, never drawn by the image model): Arial / Helvetica family.
- Logo rules: logo stays in its template safe zone; never redrawn by the image model.

## Page rules

- Density: medium. Roughly 60% text / 40% visual on content pages.
- Recurring elements: page number, source note, footer with college name.
- Forbidden elements: watermarks, stock-photo look, invented charts with fake data, any text drawn inside the generated illustration.

## Approved prompt fragments

- "flat vector educational illustration, soft shading, clean outlines"
- "friendly college-campus atmosphere"
- "single clear focal concept, uncluttered composition"
