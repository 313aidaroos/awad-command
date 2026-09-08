'use client';

import { money } from '@/lib/format';
import { getProject } from '@/projects/registry';
import { Metric } from '@/ui/Metric';
import { useCommandStore } from '@/store/useCommandStore';

export function HoverHud() {
  const slug = useCommandStore((s) => s.hoveredProject);
  const view = useCommandStore((s) => s.view);
  const runtime = useCommandStore((s) => (slug ? s.projects[slug] : undefined));
  const project = slug ? getProject(slug) : undefined;
  if (!slug || !project || !runtime || view !== 'universe') return null;
  return (
    <div className="pointer-events-none fixed left-4 top-14 z-20 hidden md:block text-[11px]">
      <div className="text-[12px] tracking-[0.18em] text-[rgba(230,232,236,0.9)]">{project.name}</div>
      <div className="mt-1 flex gap-2 text-[var(--muted)]">
        <span>MRR</span>
        <Metric value={money(Number(runtime.metrics.mrr ?? 0))} />
      </div>
    </div>
  );
}
