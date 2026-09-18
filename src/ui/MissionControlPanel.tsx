'use client';

import { clock } from '@/lib/format';
import { Glass } from '@/ui/Glass';
import { useCommandStore } from '@/store/useCommandStore';

function valueText(value: { available: true; count?: number; amount?: number; monthlyUsd?: number; paused?: boolean } | { available: false; reason: string }) {
  if (!value.available) return 'unavailable';
  if ('amount' in value && typeof value.amount === 'number') return `$${value.amount.toLocaleString()}`;
  if ('monthlyUsd' in value && typeof value.monthlyUsd === 'number') return `$${value.monthlyUsd.toLocaleString()}/mo${value.paused ? ' · paused' : ''}`;
  return String(value.count ?? 0);
}

export function MissionControlPanel() {
  const open = useCommandStore((s) => s.missionOpen);
  const view = useCommandStore((s) => s.view);
  const mission = useCommandStore((s) => s.mission);
  if (!open || view !== 'universe') return null;

  const topSupport = mission.support.slice(0, 6);

  return (
    <Glass className="fixed right-6 top-16 z-20 hidden xl:block w-[320px] max-h-[calc(100vh-5rem)] overflow-auto p-3.5 text-[11px]">
      <h4 className="mb-2 flex items-center justify-between text-[10px] tracking-[0.14em] text-[var(--muted)] font-normal">
        <span><span className="dot" />Mission Control</span>
        <span className="tag" style={{ margin: 0 }}>{mission.source === 'live' ? 'live' : 'unavailable'}</span>
      </h4>
      <div className="grid grid-cols-2 gap-2 border-b border-[var(--line)] pb-2 font-num text-[10px] text-[var(--muted)]">
        <span>Cixy {mission.cixy.status}</span>
        <span>{mission.checkedAt ? clock(mission.checkedAt) : 'not checked'}</span>
        <span>Fleet {mission.fleet.up}/{mission.fleet.total}</span>
        <span>Slowest {mission.fleet.slowest ? `${mission.fleet.slowest.name} ${mission.fleet.slowest.ms}ms` : 'unavailable'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 border-b border-[var(--line)] py-2">
        <div>
          <span className="block text-[var(--muted)]">Revenue today</span>
          <b className="font-num font-normal">{valueText(mission.financial.revenueToday)}</b>
        </div>
        <div>
          <span className="block text-[var(--muted)]">Leads today</span>
          <b className="font-num font-normal">{valueText(mission.financial.leadsToday)}</b>
        </div>
        <div>
          <span className="block text-[var(--muted)]">Open tasks</span>
          <b className="font-num font-normal">{valueText(mission.ops.openTasks)}</b>
        </div>
        <div>
          <span className="block text-[var(--muted)]">Costs / pause</span>
          <b className="font-num font-normal">{valueText(mission.financial.costs)}</b>
        </div>
      </div>
      <div className="border-b border-[var(--line)] py-2">
        <div className="mb-1 text-[10px] tracking-[0.12em] text-[var(--muted)]">Admin</div>
        <div className="flex justify-between gap-2"><span>{mission.ownerAdminEmail}</span><span>{mission.support[0]?.authAdmin.available ? mission.support[0].authAdmin.status : 'unavailable'}</span></div>
      </div>
      <div className="py-2">
        <div className="mb-1 text-[10px] tracking-[0.12em] text-[var(--muted)]">Support aliases / tickets</div>
        {topSupport.map((item) => (
          <div key={item.slug} className="grid grid-cols-[88px_1fr_auto] gap-2 py-0.5">
            <span className="truncate text-[var(--text)]">{item.name}</span>
            <span className="truncate text-[var(--muted)]">{item.supportAlias}</span>
            <span className="font-num text-[var(--muted)]">{item.openTickets.available ? item.openTickets.count : '—'}</span>
          </div>
        ))}
        {mission.support.length > topSupport.length ? <div className="pt-1 text-[10px] text-[var(--muted)]">+{mission.support.length - topSupport.length} more tracked</div> : null}
      </div>
    </Glass>
  );
}
