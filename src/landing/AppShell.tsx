'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { MobileNavigation, Sidebar, TopNavigation } from '@/landing/Navigation';
import type { LedTone } from '@/landing/primitives';
import { useLandingData } from '@/landing/useLandingData';
import { buildActivity, buildGlobalFinancialSummary, buildProjectRows, buildSystemHealth } from '@/lib/dashboardData';
import { CeoConsole } from '@/ui/CeoConsole';
import { useCommandStore } from '@/store/useCommandStore';

/** Wraps every non-3D page: header, tabs, sidebar, Cixy console, live data. */
export function AppShell({ children }: { children: (data: ReturnType<typeof useDashboard>) => ReactNode }) {
  const data = useDashboard();
  useEffect(() => {
    // Cixy console renders nothing while the store is in 'boot'; landing pages are not 3D so mark ready.
    const s = useCommandStore.getState();
    s.initFromRegistry();
    if (s.view === 'boot') useCommandStore.setState({ view: 'universe', booted: true });
  }, []);
  const tone: LedTone = data.health.overall === 'ALL SYSTEMS OPERATIONAL' ? 'green' : data.health.overall === 'CHECKING' ? 'off' : data.health.overall === 'DEGRADED' ? 'amber' : 'red';
  return (
    <div className="min-h-screen">
      <TopNavigation systemTone={tone} criticalAlerts={data.health.criticalAlerts} />
      <div className="mx-auto flex max-w-[1500px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 lg:pb-10">{children(data)}</main>
      </div>
      <MobileNavigation />
      <CeoConsole />
    </div>
  );
}

export function useDashboard() {
  const { fleet, mission, loading, error } = useLandingData();
  const sites = fleet?.sites ?? [];
  return useMemo(() => {
    const rows = buildProjectRows(sites, mission);
    return {
      fleet,
      mission,
      loading,
      error,
      sites,
      rows,
      finance: buildGlobalFinancialSummary(mission),
      health: buildSystemHealth(sites, mission),
      activity: buildActivity(sites, mission),
    };
  }, [fleet, mission, loading, error, sites]);
}
