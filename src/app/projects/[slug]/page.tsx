'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getModule } from '@/config/modules';
import { AppShell } from '@/landing/AppShell';
import { CommandButton, RetroPanel, StatusBadge } from '@/landing/primitives';

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const mod = getModule(slug);
  return (
    <AppShell>
      {(d) => {
        const row = d.rows.find((r) => r.slug === slug);
        if (!mod) return <p className="text-[12px]">Unknown project. <Link href="/projects">Back to projects</Link></p>;
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl" style={{ color: mod.accent }}>{mod.glyph}</span>
              <h1 className="font-display text-[14px]">{mod.name.toUpperCase()}</h1>
              {row ? <StatusBadge label={row.status} tone={row.status === 'ONLINE' ? 'green' : row.status === 'OFFLINE' ? 'red' : 'amber'} /> : null}
            </div>
            <p className="text-[12px] text-[var(--muted)]">{mod.description}</p>
            <div className="grid gap-4 lg:grid-cols-3">
              <RetroPanel title="SITE">
                <p className="font-num text-[12px]">{mod.url ?? 'no public site'}</p>
                <p className="font-num mt-1 text-[11px] text-[var(--muted)]">latency {row?.latencyMs !== null && row?.latencyMs !== undefined ? `${row.latencyMs}ms` : 'unavailable'}</p>
                {mod.url ? <div className="mt-3"><CommandButton href={mod.url} external>OPEN SITE ↗</CommandButton></div> : null}
              </RetroPanel>
              <RetroPanel title="SUPPORT">
                <p className="text-[12px]">alias {row?.supportAlias ?? 'unavailable'}</p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">open tickets {row?.openTickets.available ? row.openTickets.count : 'unavailable'}</p>
              </RetroPanel>
              <RetroPanel title="FINANCE">
                <p className="text-[11px] text-[var(--muted)]">Company ledger not connected to Command. Revenue, expenses and profit appear here once the aggregation layer reads this company&apos;s Supabase schema.</p>
              </RetroPanel>
            </div>
            <CommandButton href="/command">VIEW IN 3D DECK →</CommandButton>
          </div>
        );
      }}
    </AppShell>
  );
}
