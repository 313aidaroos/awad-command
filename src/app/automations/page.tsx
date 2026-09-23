'use client';

import { AppShell } from '@/landing/AppShell';
import { SystemHealthPanel, RecentActivity } from '@/landing/Panels';

export default function Page() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">AUTOMATIONS</h1>
          <p className="text-[12px] text-[var(--muted)]">Scheduled jobs and background workers.</p>
          <div className="grid gap-4 lg:grid-cols-3"><SystemHealthPanel health={d.health} /><RecentActivity items={d.activity} /></div>
        </div>
      )}
    </AppShell>
  );
}
