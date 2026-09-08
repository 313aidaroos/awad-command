'use client';

import { useEffect, useRef } from 'react';
import { money } from '@/lib/format';
import { Glass } from '@/ui/Glass';
import { Metric } from '@/ui/Metric';
import { useCommandStore } from '@/store/useCommandStore';

export function MorningBriefing() {
  const open = useCommandStore((s) => s.contextPanel === 'briefing');
  const seen = useCommandStore((s) => s.briefingSeen);
  const booted = useCommandStore((s) => s.booted);
  const setSeen = useCommandStore((s) => s.setBriefingSeen);
  const openPanel = useCommandStore((s) => s.openPanel);
  const closePanel = useCommandStore((s) => s.closePanel);
  const enter = useCommandStore((s) => s.enterProject);
  const setMode = useCommandStore((s) => s.setMode);
  const projects = useCommandStore((s) => s.projects);
  const offered = useRef(false);

  useEffect(() => {
    if (!booted || seen || offered.current) return;
    const key = `awad-briefing-${new Date().toDateString()}`;
    if (window.localStorage.getItem(key)) {
      setSeen(true);
      return;
    }
    offered.current = true;
    const t = window.setTimeout(() => openPanel('briefing'), 1500);
    return () => window.clearTimeout(t);
  }, [booted, seen, openPanel, setSeen]);

  if (!open) return null;

  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning, Awad' : hour < 18 ? 'Good afternoon, Awad' : 'Good evening, Awad';
  const operational = Object.values(projects).filter((p) => p.status === 'operational').length;
  const revenue = Object.values(projects).reduce((s, p) => s + Number(p.metrics.revenueToday ?? 0), 0);
  const leads = Object.values(projects).reduce((s, p) => s + Number(p.metrics.newLeads ?? 0), 0);

  function dismiss() {
    window.localStorage.setItem(`awad-briefing-${new Date().toDateString()}`, '1');
    setSeen(true);
    closePanel();
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 grid place-items-start justify-center bg-black/35 pt-[16vh]" onClick={dismiss}>
    <Glass className="w-[min(640px,calc(100%-32px))] p-5" onClick={(e) => e.stopPropagation()}>
      <h2 className="text-lg font-light tracking-[0.08em]">{hello}</h2>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Operational</span>
          <Metric value={String(operational)} />
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Revenue today</span>
          <Metric value={money(revenue)} />
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">New leads</span>
          <Metric value={String(leads)} />
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--muted)] leading-relaxed">
        CEO recommendation: Contraxis is the highest-activity orb. Lead volume is up in the demo stream — inspect
        conversion before any spend. Approve still records only.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            dismiss();
            enter('contraxis');
            setMode('analytics');
          }}
          className="rounded-full bg-[var(--accent)]/20 px-3 py-1.5 text-xs"
        >
          Investigate
        </button>
        <button type="button" onClick={dismiss} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)]">
          Dismiss
        </button>
      </div>
    </Glass>
    </div>
  );
}
