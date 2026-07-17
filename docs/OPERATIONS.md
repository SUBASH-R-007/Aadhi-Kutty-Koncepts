# Operations & Setup

## Prerequisites

- **Node 20+**
- **PostgreSQL** — via Docker, or the built-in no-Docker embedded server.

## First run

```bash
cp .env.example .env          # defaults work out of the box
npm install

# Start PostgreSQL on port 5433 — pick ONE:
npm run db:up                 # Docker:   docker compose up -d db
npm run db:local              # No Docker: embedded PostgreSQL (leave running)

npm run db:migrate            # prisma migrate dev
npm run db:seed               # seed Aadhi bible + default creative context
npm run dev                   # http://localhost:3000
```

No API keys are needed to try the full workflow — the **mock** text and image
providers are deterministic and keyless.

### `npm run db:local` (no Docker)

`scripts/dev-db.ts` runs a real PostgreSQL via `embedded-postgres`. On first run
it downloads a self-contained binary and initializes `.pgdata/` (git-ignored),
creates the `aadhi_studio` database, and listens on `localhost:5433` — matching
the `docker-compose` credentials. Leave the process running; Ctrl+C stops it.
**This is how the app was verified end-to-end on Windows.**

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (no DB needed) |
| `npm run test:e2e` | Playwright full-workflow smoke test (needs DB + a free port 3000) |
| `npm run format` | Prettier |
| `npm run db:up` / `db:local` | Start Postgres (Docker / embedded) |
| `npm run db:migrate` / `db:seed` | Migrate / seed |

## Environment variables (`.env`)

| Var | Meaning |
|---|---|
| `DATABASE_URL` | Postgres connection (defaults to `…@localhost:5433/aadhi_studio`) |
| `STORAGE_DRIVER` | `local` (dev) or `s3` |
| `LOCAL_STORAGE_DIR` | local storage root (default `.storage`) |
| `S3_ENDPOINT/REGION/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY` | S3 driver config |
| `OPENAI_API_KEY`, `GEMINI_API_KEY` | provider keys (server-side only; empty ⇒ mock fallback) |
| `OPENAI_TEXT_MODEL`, `GEMINI_TEXT_MODEL` | text model defaults |
| `OPENAI_IMAGE_MODEL`, `GEMINI_IMAGE_MODEL` | image model defaults (`gpt-image-1`, `gemini-2.5-flash-image`) |
| `QUEUE_DRIVER` | `inprocess` |

Model names are also overridable at runtime in **Settings** (stored in
`AppConfig`), which take precedence over the env defaults.

## Providers & API keys

- **Text**: choose OpenAI, Gemini, or Mock per project. Missing key ⇒ mock
  fallback with a warning surfaced in the job.
- **Images**: choose OpenAI, Gemini, or Mock per project. **Both real providers
  receive the approved Aadhi reference images** (OpenAI via `images/edits`,
  Gemini via inline parts). Mock ignores references.
- Each `generate-visual` job reports how many references were attached
  (`referencesAttached` / `referencesAvailable` in the job result, and a live
  progress message), so you can confirm the mascot went to the API.

## The mascot & logo (already wired for this repo)

The confirmed assets live in `brand/`:

- `brand/aadhi-reference-hero.png` — the purple-varsity Aadhi hero shot,
  ingested as a global `AadhiReference` (attached to every real image request).
- `brand/rec-logo.png` — the Rajalakshmi Engineering College torch-R logo.

To (re)load them after a fresh DB, use the app UI:

- **Aadhi references**: Settings → Aadhi Character Bible → *Approved reference
  images* → upload `brand/aadhi-reference-hero.png` (add more poses if desired).
- **College logo**: open a project → Template step → *College logo* → upload
  `brand/rec-logo.png`.

## Troubleshooting

**"Billing hard limit has been reached" (OpenAI 400).** The request reached
OpenAI correctly (mascot included) but the account's billing cap is hit. Add
credits / raise the limit at platform.openai.com → Billing, or use Gemini
instead (add `GEMINI_API_KEY` and set the project's image provider to Gemini).

**"Can't reach database server at localhost:5433".** The embedded Postgres
process died or was orphaned (e.g. the terminal that ran `db:local` closed),
sometimes leaving a stale `.pgdata/postmaster.pid`. Fix:

```bash
# kill any leftover embedded postgres (Console-session), then:
rm -f .pgdata/postmaster.pid
npm run db:local
```

The `.pgdata/` files persist your schema and data, so a restart loses nothing.
If the Next dev server had cached a dead connection, restart `npm run dev` too.

**Prisma engine EPERM on Windows during `prisma generate`.** The running dev
server locks the query-engine DLL. Stop `npm run dev`, run `npx prisma
generate`, then restart.

**e2e times out on `webServer`.** Playwright starts its own dev server and needs
**port 3000 free** and the DB up. Stop any running preview/dev server first.

## Assumptions (MVP)

- **No authentication** — single-team internal tool. Add NextAuth (or similar)
  before any public deployment.
- **PDF-page template backgrounds** aren't supported yet (PNG/JPEG/SVG are); the
  API returns a clear message and an adapter slot exists.
- **PPTX extraction** reads slide shape text (not speaker notes).
- The in-process queue runs inside the Next server process — fine for dev/small
  deployments; swap in a Redis driver for horizontal scale.
- The renderer uses Arial/Helvetica system fonts for deterministic typography.
- Local Postgres runs on **port 5433** to avoid clashing with an existing
  install.
