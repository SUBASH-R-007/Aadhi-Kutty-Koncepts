import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { pages: true, sources: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-slate-600">
            Turn source material into novice + advanced booklets starring Aadhi.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
        >
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          <p className="mb-2 text-3xl" aria-hidden>
            🦌
          </p>
          <p>No projects yet. Create one to start the workflow.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow"
              >
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">{p.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {p.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{p.subject}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {p._count.sources} source(s) · {p._count.pages} page(s) · {p.textProvider} text ·{" "}
                  {p.imageProvider} images
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
