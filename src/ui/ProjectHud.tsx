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
  const following = useCommandStore((s) => s.followingAgent);
  const runtime = useCommandStore((s) => (slug ? s.projects[slug] : undefined));
  const agents = useCommandStore((s) => s.agents);
  const mode = useCommandStore((s) => s.mode);
  const panel = useCommandStore((s) => s.contextPanel);
  const returnToUniverse = useCommandStore((s) => s.returnToUniverse);
  const followAgent = useCommandStore((s) => s.followAgent);
  const openPanel = useCommandStore((s) => s.openPanel);
  const closePanel = useCommandStore((s) => s.closePanel);
  const project = slug ? getProject(slug) : undefined;
  if (!slug || slug === 'daily-host' || !project || !runtime || following) return null;
  const lead = getLeadBySlug(slug);
  const followable = project.agents.find((agent) => agent.name.startsWith('Sales')) ?? project.agents[0];
  const expanded = panel === 'lead' || panel === 'analytics';

  return (
    <>
      <div className="pointer-events-auto fixed left-4 top-14 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => returnToUniverse()}
          className="rounded-full border border-[var(--line)] bg-[rgba(23,26,31,0.4)] px-3 py-1.5 text-[11px] text-[var(--muted)]"
        >
          ← Universe
        </button>
        <button
          type="button"
          onClick={() => (expanded ? closePanel() : openPanel('lead'))}
          className="rounded-full border border-[var(--line)] bg-[rgba(23,26,31,0.4)] px-3 py-1.5 text-[11px] tracking-[0.12em]"
        >
          {project.name}
        </button>
        {followable ? (
          <button
            type="button"
            onClick={() => followAgent(followable.id)}
            className="rounded-full border border-[var(--line)] bg-[rgba(23,26,31,0.4)] px-3 py-1.5 text-[11px] text-[var(--muted)]"
          >
            Follow
          </button>
        ) : null}
      </div>
      {expanded ? (
        <Glass className="fixed right-4 top-14 z-20 w-[min(280px,calc(100%-32px))] p-3 text-xs max-h-[68vh] overflow-auto">
          <h3 className="text-sm font-light tracking-[0.24em]">{project.name}</h3>
          <p className="mb-2 text-[11px] text-[var(--muted)]">
            {project.tagline}
            {project.comingSoon ? <span className="tag">coming soon</span> : null}
          </p>
          {lead ? (
            <div className="mb-2 text-[11px] text-[var(--muted)]">
              Lead <span className="text-[var(--text)]">{lead.leadName}</span>
            </div>
          ) : null}
          <div className="space-y-1 text-[var(--muted)]">
            <div className="flex justify-between">
              <span>MRR</span>
              <Metric value={money(Number(runtime.metrics.mrr ?? 0))} />
            </div>
            <div className="flex justify-between">
              <span>Leads</span>
              <Metric value={String(runtime.metrics.newLeads ?? 0)} />
            </div>
            <div className="flex justify-between">
              <span>Conversion</span>
              <Metric value={pct(Number(runtime.metrics.conversionRate ?? 0))} />
            </div>
          </div>
          {mode === 'workforce' ? (
            <div className="mt-3 border-t border-[var(--line)] pt-2">
              {project.agents.map((agent) => {
                const state = agents[agent.id];
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => followAgent(agent.id)}
                    className="flex w-full justify-between py-1 text-left text-[var(--muted)]"
                  >
                    <b className="font-normal text-[var(--text)]">{agent.name}</b>
                    <span className="text-[10px] tracking-[0.1em]">{(state?.status ?? 'idle').replace('_', ' ')}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          <LeadMessagePanel slug={slug} />
          <button
            type="button"
            onClick={() => useCommandStore.getState().openPanel('computer')}
            className="mt-3 w-full rounded-lg border border-[var(--line)] px-2 py-2 text-left text-[11px] text-[var(--muted)]"
          >
            Computer · coming online
          </button>
        </Glass>
      ) : null}
    </>
  );
}
