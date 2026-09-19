"use client";

import "./hq.css";
import { WorkspaceRoom } from "./WorkspaceRoom";
import { useEffect, useMemo, type ReactNode } from "react";
import { MobileNavigation, Sidebar, TopNavigation } from "@/landing/Navigation";
import type { LedTone } from "@/landing/primitives";
import { useLandingData } from "@/landing/useLandingData";
import {
  buildActivity,
  buildGlobalFinancialSummary,
  buildProjectRows,
  buildSystemHealth,
} from "@/lib/dashboardData";
import { CeoConsole } from "@/ui/CeoConsole";
import { useCommandStore } from "@/store/useCommandStore";

/** Wraps every non-3D page: header, tabs, sidebar, Cixy console, live data. */
export function AppShell({
  children,
  headquarters = true,
  embeddedCixy = false,
}: {
  children: (data: ReturnType<typeof useDashboard>) => ReactNode;
  headquarters?: boolean;
  embeddedCixy?: boolean;
}) {
  const data = useDashboard();
  useEffect(() => {
    // Cixy console renders nothing while the store is in 'boot'; landing pages are not 3D so mark ready.
    const s = useCommandStore.getState();
    s.initFromRegistry();
    if (s.view === "boot")
      useCommandStore.setState({ view: "universe", booted: true });
  }, []);
  const tone: LedTone =
    data.health.overall === "ALL SYSTEMS OPERATIONAL"
      ? "green"
      : data.health.overall === "CHECKING"
        ? "off"
        : data.health.overall === "DEGRADED"
          ? "amber"
          : "red";
  return (
    <div className={headquarters ? "hq-shell min-h-screen" : "min-h-screen"}>
      <TopNavigation
        systemTone={tone}
        criticalAlerts={data.health.criticalAlerts}
        headquarters={headquarters}
      />
      <div
        className={
          headquarters ? "hq-shell-body" : "mx-auto flex max-w-[1500px]"
        }
      >
        {!headquarters && <Sidebar />}
        <main
          id="main-content"
          className={
            headquarters ? "hq-main" : "min-w-0 flex-1 px-4 pb-24 pt-5 lg:pb-10"
          }
        >
          <WorkspaceRoom>{children(data)}</WorkspaceRoom>
        </main>
      </div>
      {headquarters ? (
        <footer className="hq-footer">
          <span>AWAD COMMAND</span>
          <span>
            TECHNOLOGY × DISCIPLINE × OPPORTUNITY × A BRIGHTER TOMORROW
          </span>
          <span>V1.0 · {data.health.overall}</span>
        </footer>
      ) : (
        <MobileNavigation />
      )}
      {!embeddedCixy && <CeoConsole />}
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
