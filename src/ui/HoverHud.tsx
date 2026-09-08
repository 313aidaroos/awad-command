'use client';

import { money } from '@/lib/format';
import { getProject } from '@/projects/registry';
import { Glass } from '@/ui/Glass';
import { Metric } from '@/ui/Metric';
import { useCommandStore } from '@/store/useCommandStore';

export function HoverHud() {
  const slug = useCommandStore((s) => s.hoveredProject);
  const view = useCommandStore((s) => s.view);
  const runtime = useCommandStore((s) => (slug ? s.projects[slug] : undefined));
  const project = slug ? getProject(slug) : undefined;
  if (!slug || !project || !runtime || view !== 'universe') return null;
  return (
    <Glass className="fixed left-6 top-20 z-20 hidden md:block w-[170px] px-3 py-2.5 text-[11px]">
      <div className="text-[12px] tracking-[0.18em]">{project.name}</div>
      <div className="mt-1.5 flex justify-between text-[var(--muted)]">
        <span>MRR</span>
        <Metric value={money(Number(runtime.metrics.mrr ?? 0))} />
      </div>
    </Glass>
  );
}
