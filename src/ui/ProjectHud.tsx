'use client';

import { getLeadBySlug } from '@/config/orbLeads';
import { money, pct } from '@/lib/format';
import { getProject } from '@/projects/registry';
import { Glass } from '@/ui/Glass';
import { LeadMessagePanel } from '@/ui/LeadMessagePanel';
import { Metric } from '@/ui/Metric';
import { useCommandStore } from '@/store/useCommandStore';

export function ProjectHud() {
  const slug = useCommandStore((s) => s.focusedProject);
  const runtime = useCommandStore((s) => (slug ? s.projects[slug] : undefined));
  const agents = useCommandStore((s) => s.agents);
  const returnToUniverse = useCommandStore((s) => s.returnToUniverse);
  const openPanel = useCommandStore((s) => s.openPanel);
  const project = slug ? getProject(slug) : undefined;
  if (!slug || !project || !runtime) return null;
  const lead = getLeadBySlug(slug);
  return (
    <>
      <button
        type="button"
        onClick={() => returnToUniverse()}
        className="glass pointer-events-auto fixed left-4 top-16 z-20 px-3.5 py-2 text-xs text-[var(--muted)]"
      >
        ← Universe
      </button>
      <Glass className="fixed right-4 top-16 z-20 w-[min(320px,calc(100%-32px))] p-3.5 text-xs max-h-[70vh] overflow-auto">
        <h3 className="text-sm font-light tracking-[0.24em]">{project.name}</h3>
        <p className="mb-2.5 text-[11px] text-[var(--muted)]">
          {project.tagline}
          {project.comingSoon ? <span className="tag">coming soon</span> : null}
        </p>
        {lead ? (
          <div className="mb-3 rounded-lg border border-[var(--line)] p-2.5">
            <div className="text-[10px] tracking-[0.14em] text-[var(--muted)]">Lead</div>
            <div className="mt-1 text-[13px]">{lead.leadName}</div>
            <div className="font-num mt-1.5 break-all text-[11px] text-[var(--text)]">{lead.agentId}</div>
          </div>
        ) : null}
        <div className="space-y-1 text-[var(--muted)]">
          <div className="flex justify-between">
            <span>MRR</span>
            <Metric value={money(Number(runtime.metrics.mrr ?? 0))} />
          </div>
          <div className="flex justify-between">
            <span>Revenue today</span>
            <Metric value={money(Number(runtime.metrics.revenueToday ?? 0))} />
          </div>
          <div className="flex justify-between">
            <span>Active users</span>
            <Metric value={String(runtime.metrics.activeUsers ?? 0)} />
          </div>
          <div className="flex justify-between">
            <span>New leads</span>
            <Metric value={String(runtime.metrics.newLeads ?? 0)} />
          </div>
          <div className="flex justify-between">
            <span>Conversion</span>
            <Metric value={pct(Number(runtime.metrics.conversionRate ?? 0))} />
          </div>
        </div>
        <div className="mt-3 border-t border-[var(--line)] pt-2">
          {project.agents.map((agent) => {
            const state = agents[agent.id];
            return (
              <div key={agent.id} className="flex justify-between py-1 text-[var(--muted)]">
                <b className="font-normal text-[var(--text)]">{agent.name}</b>
                <span className="text-[10px] tracking-[0.1em]">{(state?.status ?? 'idle').replace('_', ' ')}</span>
              </div>
            );
          })}
        </div>
        <LeadMessagePanel slug={slug} />
        <button
          type="button"
          onClick={() => openPanel('computer')}
          className="mt-3 w-full rounded-lg border border-[var(--line)] px-2 py-2 text-left text-[11px] text-[var(--muted)]"
        >
          Computer · coming online
        </button>
      </Glass>
    </>
  );
}
