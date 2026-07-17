import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      template: true,
      creativeContext: true,
      _count: { select: { sources: true, pages: true, exports: true } },
      pages: { include: { variants: true, visuals: true } },
    },
  });
  if (!project) notFound();

  const approved = project.pages.filter((p) =>
    p.variants.some((v) => v.approvedAt),
  ).length;
  const withVisuals = project.pages.filter((p) => p.visuals.length > 0).length;

  const steps = [
    {
      href: `/projects/${id}/source`,
      title: "Upload source material",
      status: project._count.sources > 0 ? `${project._count.sources} source(s)` : "Not started",
      done: project._count.sources > 0,
    },
    {
      href: `/projects/${id}/content`,
      title: "Generate & edit content",
      status:
        project._count.pages > 0
          ? `${project._count.pages} page(s), ${approved} approved`
          : "Not started",
      done: approved > 0,
    },
    {
      href: `/projects/${id}/template`,
      title: "Template & safe zones",
      status: project.template ? `${project.template.name} v${project.template.version}` : "Using default layout",
      done: Boolean(project.template),
    },
    {
      href: `/projects/${id}/visuals`,
      title: "Generate visuals",
      status: withVisuals > 0 ? `${withVisuals}/${project._count.pages} pages have visuals` : "Not started",
      done: withVisuals > 0 && withVisuals === project._count.pages,
    },
    {
      href: `/projects/${id}/export`,
      title: "Export",
      status: project._count.exports > 0 ? `${project._count.exports} export(s)` : "Not started",
      done: project._count.exports > 0,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <h2 className="mb-2 font-semibold">Project settings</h2>
          <dl className="grid grid-cols-2 gap-y-1 text-slate-700">
            <dt className="text-slate-500">Audience</dt>
            <dd>{project.audience}</dd>
            <dt className="text-slate-500">Tone</dt>
            <dd>{project.tone}</dd>
            <dt className="text-slate-500">Pages</dt>
            <dd>~{project.targetPageCount}</dd>
            <dt className="text-slate-500">Format</dt>
            <dd>
              {project.aspectRatio} ({project.pageWidth}×{project.pageHeight})
            </dd>
            <dt className="text-slate-500">College</dt>
            <dd>{project.collegeName}</dd>
            <dt className="text-slate-500">Brand colors</dt>
            <dd className="flex gap-1">
              {(project.brandColors as string[]).map((c) => (
                <span key={c} className="inline-block h-4 w-4 rounded border border-slate-300" style={{ backgroundColor: c }} title={c} />
              ))}
            </dd>
            <dt className="text-slate-500">Text provider</dt>
            <dd>{project.textProvider}</dd>
            <dt className="text-slate-500">Image provider</dt>
            <dd>{project.imageProvider}</dd>
            <dt className="text-slate-500">Creative context</dt>
            <dd>
              {project.creativeContext
                ? `${project.creativeContext.name} v${project.creativeContext.version}`
                : "None selected"}
            </dd>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Providers and the creative context can be changed in the Visuals and
            Settings pages; API keys and model names are configured server-side.
          </p>
        </div>
        <ol className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={step.href}>
              <Link
                href={step.href}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm hover:border-indigo-300"
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step.done ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {step.done ? "✓" : i + 1}
                  </span>
                  <span className="font-medium">{step.title}</span>
                </span>
                <span className="text-xs text-slate-500">{step.status}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
