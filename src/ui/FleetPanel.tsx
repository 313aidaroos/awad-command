'use client';

import { clock } from '@/lib/format';
import { getProject } from '@/projects/registry';
import { Glass } from '@/ui/Glass';
import { useCommandStore } from '@/store/useCommandStore';

export function FleetPanel() {
  const open = useCommandStore((s) => s.fleetOpen);
  const view = useCommandStore((s) => s.view);
  const fleet = useCommandStore((s) => s.fleet);
  const enter = useCommandStore((s) => s.enterProject);

  if (!open || view !== 'universe') return null;

  const live = fleet.source === 'live';
  const up = fleet.sites.filter((site) => site.ok).length;

  return (
    <Glass className="fixed left-6 top-16 z-20 hidden md:block w-[280px] max-h-[85vh] min-h-[400px] overflow-y-auto p-3.5 text-[11px]">
      <h4 className="mb-2 flex items-center justify-between text-[10px] tracking-[0.14em] text-[var(--muted)] font-normal">
        <span>
          <span className="dot" />
          Fleet
        </span>
        <span className="tag" style={{ margin: 0 }}>
          {live ? 'live' : 'checking'}
        </span>
      </h4>
      {live ? (
        <p className="mb-2 font-num text-[10px] text-[var(--muted)]">
          {up}/{fleet.sites.length} up · {clock(fleet.checkedAt)}
        </p>
      ) : (
        <p className="mb-2 text-[10px] text-[var(--muted)]">Probing public company URLs…</p>
      )}
      <div>
        {fleet.sites.map((site) => (
          <button
            key={site.slug}
            type="button"
            onClick={() => {
              if (getProject(site.slug)) enter(site.slug);
            }}
            className="grid w-full grid-cols-[1fr_auto_auto] items-baseline gap-2 border-t border-[var(--line)] py-1.5 text-left first:border-0"
          >
            <span className="truncate text-[var(--text)]">{site.name}</span>
            <span className="font-num text-[10px] text-[var(--muted)]">{site.ms}ms</span>
            <span
              className="text-[10px] tracking-[0.08em]"
              style={{ color: site.ok ? '#6FE3B4' : '#E5533D' }}
            >
              {site.ok ? 'up' : 'down'}
            </span>
          </button>
        ))}
      </div>
    </Glass>
  );
}
