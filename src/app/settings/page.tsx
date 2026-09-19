'use client';

import { AppShell } from '@/landing/AppShell';
import { QuickCommands } from '@/landing/Panels';
import { RetroPanel } from '@/landing/primitives';

export default function Page() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">SETTINGS</h1>
          <p className="text-[12px] text-[var(--muted)]">Owner/admin and access.</p>
          <div className="grid gap-4 lg:grid-cols-3"><RetroPanel title="ACCOUNT"><p className="text-[12px]">Owner / admin: {d.mission?.ownerAdminEmail ?? 'awad@apixis.dev'}</p><p className="mt-1 text-[11px] text-[var(--muted)]">Support intake command@apixis.dev → owner.</p></RetroPanel><QuickCommands /></div>
        </div>
      )}
    </AppShell>
  );
}
