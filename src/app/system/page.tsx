'use client';

import { AppShell } from '@/landing/AppShell';
import { SystemHealthPanel, RecentActivity, DailyBrief } from '@/landing/Panels';
import { RetroPanel } from '@/landing/primitives';

export default function Page() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">SYSTEM</h1>
          <p className="text-[12px] text-[var(--muted)]">Health of every subsystem, real status only.</p>
          <div className="grid gap-4 lg:grid-cols-3"><SystemHealthPanel health={d.health} /><RecentActivity items={d.activity} /><DailyBrief mission={d.mission} rows={d.rows} /></div>
        </div>
      )}
    </AppShell>
  );
}
