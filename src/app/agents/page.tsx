'use client';

import { AppShell } from '@/landing/AppShell';
import { CixyPanel, QuickCommands } from '@/landing/Panels';
import Link from 'next/link';
import { RetroPanel } from '@/landing/primitives';

export default function Page() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">AGENTS</h1>
          <p className="text-[12px] text-[var(--muted)]">Explore your workforce inside each company office.</p>
          <Link className="text-cyan-300 text-sm" href="/business-world">OPEN BUSINESS WORLD →</Link><div className="grid gap-4 lg:grid-cols-3"><CixyPanel mission={d.mission} rows={d.rows} /><QuickCommands /><RetroPanel title="AGENT TASKS"><p className="text-[12px]">Open tasks: {d.mission?.ops.openTasks.available ? d.mission.ops.openTasks.count : 'unavailable'}</p><p className="mt-1 text-[11px] text-[var(--muted)]">Worker {d.mission?.ops.computer.workerConnected ? 'online' : 'offline'}. Cron {d.mission?.cixy.cronPaused ? 'paused' : 'running'}.</p></RetroPanel></div>
        </div>
      )}
    </AppShell>
  );
}
