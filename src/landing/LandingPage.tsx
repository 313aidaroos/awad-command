"use client";
import { AppShell } from "@/landing/AppShell";
import { HeroCommandCenter, ModuleStrip } from "@/landing/Hero";
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
} from "@/landing/Panels";
export function LandingPage() {
  return (
    <AppShell headquarters>
      {(d) => (
        <>
          <HeroCommandCenter
            up={d.sites.filter((s) => s.ok).length}
            total={d.sites.length}
          />
          <div className="hq-content">
            <ModuleStrip />
            <div className="hq-dashboard">
              <GlobalFinancialOverview summary={d.finance} compact />
              <ProjectStatusPanel rows={d.rows} loading={d.loading} compact />
              <SystemHealthPanel health={d.health} compact />
              <NewsFeed compact />
              <div className="hq-mobile-cixy">
                <CixyPanel mission={d.mission} rows={d.rows} />
              </div>
            </div>
            <BuildScaleImpact />
            <div className="hq-secondary">
              <div className="hq-desktop-cixy">
                <CixyPanel mission={d.mission} rows={d.rows} />
              </div>
              <QuickCommands />
            </div>
            <div className="hq-secondary">
              <DailyBrief mission={d.mission} rows={d.rows} />
              <RecentActivity items={d.activity} />
            </div>
            <ProjectHealthGrid rows={d.rows} />
            {d.error && (
              <p className="hq-source-error" role="status">
                Live sources: {d.error}
              </p>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
