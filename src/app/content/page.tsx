'use client';

import { AppShell } from '@/landing/AppShell';
import { ProjectStatusPanel } from '@/landing/Panels';

export default function Page() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">CONTENT STUDIO</h1>
          <p className="text-[12px] text-[var(--muted)]">One-minute social videos (Content Bot).</p>
          <div className="grid gap-4 lg:grid-cols-3"><ProjectStatusPanel rows={d.rows.filter((r) => r.slug === 'content' || r.slug === 'socixis')} loading={d.loading} /></div>
        </div>
      )}
    </AppShell>
  );
}
