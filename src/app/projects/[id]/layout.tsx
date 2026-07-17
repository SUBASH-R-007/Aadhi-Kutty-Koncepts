import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StepNav } from "@/components/StepNav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { name: true, subject: true },
  });
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{project.name}</h1>
        <p className="text-sm text-slate-600">{project.subject}</p>
      </div>
      <StepNav projectId={id} />
      {children}
    </div>
  );
}
