'use client';

import { AppShell } from '@/landing/AppShell';
import { HeroCommandCenter, ModuleStrip } from '@/landing/Hero';
import {
  BuildScaleImpact,
  CixyPanel,
  DailyBrief,
  GlobalFinancialOverview,
  NewsFeed,
  ProjectHealthGrid,
  ProjectStatusPanel,
  QuickCommands,
  RecentActivity,
  SystemHealthPanel,
} from '@/landing/Panels';

export function LandingPage() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-6">
          <HeroCommandCenter up={d.sites.filter((s) => s.ok).length} total={d.sites.length} />
          <ModuleStrip />
          <div className="grid gap-4 lg:grid-cols-3">
            <GlobalFinancialOverview summary={d.finance} />
            <ProjectStatusPanel rows={d.rows} loading={d.loading} />
            <SystemHealthPanel health={d.health} />
            <CixyPanel mission={d.mission} rows={d.rows} />
            <QuickCommands />
            <ProjectHealthGrid rows={d.rows} />
            <DailyBrief mission={d.mission} rows={d.rows} />
            <RecentActivity items={d.activity} />
            <NewsFeed />
          </div>
          <BuildScaleImpact />
          {d.error ? <p className="text-[10px] text-[var(--red)]">Live sources: {d.error}</p> : null}
        </div>
      )}
    </AppShell>
  );
}
