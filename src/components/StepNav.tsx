"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const steps = [
  { slug: "", label: "1 · Overview" },
  { slug: "source", label: "2 · Source" },
  { slug: "content", label: "3 · Content" },
  { slug: "template", label: "4 · Template" },
  { slug: "visuals", label: "5 · Visuals" },
  { slug: "export", label: "6 · Export" },
];

export function StepNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Workflow steps" className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
      {steps.map((step) => {
        const href = `/projects/${projectId}${step.slug ? `/${step.slug}` : ""}`;
        const active = pathname === href;
        return (
          <Link
            key={step.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              active ? "bg-indigo-700 text-white" : "text-slate-700 hover:bg-slate-100",
            )}
          >
            {step.label}
          </Link>
        );
      })}
    </nav>
  );
}
