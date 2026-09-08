'use client';

import { money, pct } from '@/lib/format';
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
    <Glass className="fixed left-6 top-20 z-20 hidden md:block w-[190px] p-3.5 text-[11.5px]">
      <div className="mb-2.5 border-b border-[var(--line)] pb-1.5 text-[13px] tracking-[0.2em]">{project.name}</div>
      <div className="flex justify-between py-0.5 text-[var(--muted)]">
        <span>MRR</span>
        <Metric value={money(Number(runtime.metrics.mrr ?? 0))} />
      </div>
      <div className="flex justify-between py-0.5 text-[var(--muted)]">
        <span>Revenue today</span>
        <Metric value={money(Number(runtime.metrics.revenueToday ?? 0))} />
      </div>
      <div className="flex justify-between py-0.5 text-[var(--muted)]">
        <span>Users</span>
        <Metric value={String(runtime.metrics.activeUsers ?? 0)} />
      </div>
      <div className="flex justify-between py-0.5 text-[var(--muted)]">
        <span>Leads</span>
        <Metric value={String(runtime.metrics.newLeads ?? 0)} />
      </div>
      <div className="flex justify-between py-0.5 text-[var(--muted)]">
        <span>Conversion</span>
        <Metric value={pct(Number(runtime.metrics.conversionRate ?? 0))} />
      </div>
      <div className="mt-2 text-[10px] tracking-[0.14em]" style={{ color: 'var(--s-operational)' }}>
        {runtime.status}
        <span className="tag">demo</span>
      </div>
    </Glass>
  );
}
