import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { pages: true, sources: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl border border-purple-900/10 shadow-lg"
        style={{ backgroundColor: "var(--studio)" }}
      >
        {/* Aadhi mascot photo, anchored to the left of the panel */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/aadhi-hero.png"
          alt="Aadhi, the Rajalakshmi Engineering College mascot"
          className="pointer-events-none absolute left-0 top-0 h-full w-auto select-none object-cover object-left"
        />
        {/* Purple wash: transparent over Aadhi (left) → solid brand for the copy (right) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(233,233,236,0) 26%, rgba(75,32,114,0.55) 44%, rgba(75,32,114,0.96) 60%, #4B2072 100%)",
          }}
        />
        <div className="relative z-10 ml-auto flex min-h-[340px] max-w-xl flex-col justify-center gap-4 p-8 text-right sm:min-h-[400px] sm:p-12">
          <span className="ml-auto inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/25">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F4A81D]" />
            Rajalakshmi Engineering College
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Aadhi <span className="text-[#F4A81D]">Learning Studio</span>
          </h1>
          <p className="ml-auto max-w-md text-sm leading-relaxed text-purple-100 sm:text-base">
            Turn any source material into novice &amp; advanced, page-by-page
            illustrated learning content — starring Aadhi, your college mascot —
            and export it as a polished booklet.
          </p>
          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <Link
              href="/projects/new"
              className="rounded-lg bg-[#F4A81D] px-5 py-2.5 text-sm font-semibold text-[#3d1a52] shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              + New project
            </Link>
            <Link
              href="/settings"
              className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/20"
            >
              Settings
            </Link>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your projects</h2>
            <p className="text-sm text-slate-500">
              {projects.length === 0
                ? "Nothing here yet — create your first project to begin."
                : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {projects.length > 0 && (
            <Link
              href="/projects/new"
              className="rounded-md bg-[#5A277F] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#4B2072]"
            >
              + New project
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-purple-300 bg-white/70 p-12 text-center">
            <p className="mb-3 text-4xl" aria-hidden>
              🦌
            </p>
            <p className="font-medium text-slate-700">No projects yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create one to start the upload → generate → illustrate → export workflow.
            </p>
            <Link
              href="/projects/new"
              className="mt-5 inline-block rounded-lg bg-[#5A277F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4B2072]"
            >
              + New project
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 transition group-hover:text-[#5A277F]">
                      {p.name}
                    </h3>
                    <StatusPill status={p.status} />
                  </div>
                  <p className="text-sm text-slate-600">{p.subject}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <Meta>{p._count.sources} source(s)</Meta>
                    <Meta>{p._count.pages} page(s)</Meta>
                    <Meta>{p.textProvider} text</Meta>
                    <Meta>{p.imageProvider} images</Meta>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{children}</span>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "exported"
      ? "bg-green-100 text-green-800"
      : status === "content"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}
