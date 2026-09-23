'use client';

import { AppShell } from '@/landing/AppShell';
import { GlobalFinancialOverview, ProjectHealthGrid } from '@/landing/Panels';

export default function Page() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">ANALYTICS</h1>
          <p className="text-[12px] text-[var(--muted)]">Cross-company metrics. Ledger aggregation is not connected yet; nothing is invented.</p>
          <div className="grid gap-4 lg:grid-cols-3"><GlobalFinancialOverview summary={d.finance} /><ProjectHealthGrid rows={d.rows} /></div>
        </div>
      )}
    </AppShell>
  );
}
