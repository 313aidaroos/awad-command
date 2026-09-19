'use client';

import { AppShell } from '@/landing/AppShell';
import { CixyPanel, DailyBrief } from '@/landing/Panels';
import { RetroPanel } from '@/landing/primitives';

export default function Page() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">STRATEGY LAB</h1>
          <p className="text-[12px] text-[var(--muted)]">Recommendations and notes. Cixy drafts; Awad decides.</p>
          <div className="grid gap-4 lg:grid-cols-3"><CixyPanel mission={d.mission} rows={d.rows} /><DailyBrief mission={d.mission} rows={d.rows} /></div>
        </div>
      )}
    </AppShell>
  );
}
