'use client';

import { AppShell } from '@/landing/AppShell';
import { NewsFeed } from '@/landing/Panels';
import { RetroPanel } from '@/landing/primitives';

export default function Page() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">NEWS</h1>
          <p className="text-[12px] text-[var(--muted)]">Aggregated news relevant to the ecosystem.</p>
          <div className="grid gap-4 lg:grid-cols-3"><NewsFeed /></div>
        </div>
      )}
    </AppShell>
  );
}
