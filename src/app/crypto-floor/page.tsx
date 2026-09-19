'use client';

import { AppShell } from '@/landing/AppShell';
import { RecentActivity } from '@/landing/Panels';
import { RetroPanel } from '@/landing/primitives';

export default function Page() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">THE CRYPTO FLOOR</h1>
          <p className="text-[12px] text-[var(--muted)]">Autonomous paper-trading floor. Not connected to Command yet — no positions or P&L are shown until the trading engine reports in.</p>
          <div className="grid gap-4 lg:grid-cols-3"><RetroPanel title="TRADING ENGINE"><p className="text-[12px] text-[var(--muted)]">Status: not connected. Paper mode only when it arrives — no live capital without explicit approval.</p></RetroPanel><RecentActivity items={d.activity} /></div>
        </div>
      )}
    </AppShell>
  );
}
