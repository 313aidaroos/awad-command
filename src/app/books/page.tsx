'use client';

import { AppShell } from '@/landing/AppShell';
import { QuickCommands } from '@/landing/Panels';
import { RetroPanel } from '@/landing/primitives';

export default function Page() {
  return (
    <AppShell>
      {() => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">BOOKS & MEDIA</h1>
          <p className="text-[12px] text-[var(--muted)]">KDP and publishing operations.</p>
          <div className="grid gap-4 lg:grid-cols-3"><RetroPanel title="PUBLISHING"><p className="text-[12px] text-[var(--muted)]">No KDP account connected to Command.</p></RetroPanel><QuickCommands /></div>
        </div>
      )}
    </AppShell>
  );
}
