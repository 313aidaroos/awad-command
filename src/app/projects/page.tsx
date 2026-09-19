'use client';

import { AppShell } from '@/landing/AppShell';
import { ProjectStatusPanel, ProjectHealthGrid } from '@/landing/Panels';
import { RetroPanel } from '@/landing/primitives';

export default function Page() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">PROJECTS</h1>
          <p className="text-[12px] text-[var(--muted)]">Every company connected to Command, read from the module registry and probed live.</p>
          <div className="grid gap-4 lg:grid-cols-3"><ProjectHealthGrid rows={d.rows} /><ProjectStatusPanel rows={d.rows} loading={d.loading} /></div>
        </div>
      )}
    </AppShell>
  );
}
