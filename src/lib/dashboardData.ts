// Change note (Claude, Sep 2026): Dashboard reads Wallet totals. See docs/LAUNCH_NOTES.md.
import { companyModules } from '@/config/modules';
import type { Availability, MissionControlSnapshot } from '@/lib/missionControl';
import type { FleetSiteStatus } from '@/lib/fleetProbe';

/**
 * Data adapters for the landing dashboard.
 * Real data comes from /api/fleet and /api/mission-control (already live).
 * Anything not connected returns `available:false` with a reason — never invented numbers.
 * TODO(integration): wire GlobalFinancialSummary to a server-side aggregation over each company's
 * Supabase `sales`/`expenses` tables once the per-company service keys exist.
 */

export type Money = Availability<{ amount: number }>;

export interface GlobalFinancialSummary {
  source: 'live' | 'partial' | 'unavailable';
  totalCash: Money;
  totalRevenue: Money;
  totalExpenses: Money;
  totalProfit: Money;
  totalInvestments: Money;
  receivables: Money;
  payables: Money;
  todayRevenue: Money;
  monthRevenue: Money;
  yearRevenue: Money;
  profitMargin: Availability<{ pct: number }>;
  momChange: Availability<{ pct: number }>;
  ytdChange: Availability<{ pct: number }>;
  series: number[];
}

export type ProjectHealth = 'healthy' | 'attention' | 'building' | 'development' | 'offline' | 'unknown';
export type ProjectStatusLabel = 'ONLINE' | 'BUILDING' | 'DEVELOPMENT' | 'PAUSED' | 'ATTENTION' | 'OFFLINE' | 'UNKNOWN';

export interface ProjectRowData {
  slug: string;
  name: string;
  route: string;
  url?: string;
  accent: string;
  glyph: string;
  status: ProjectStatusLabel;
  health: ProjectHealth;
  latencyMs: number | null;
  supportAlias: string;
  openTickets: Availability<{ count: number }>;
}

export interface SystemHealthRow {
  name: string;
  state: 'online' | 'degraded' | 'offline' | 'unavailable';
  detail?: string;
}

export interface SystemHealth {
  overall: 'ALL SYSTEMS OPERATIONAL' | 'DEGRADED' | 'ATTENTION REQUIRED' | 'CHECKING';
  rows: SystemHealthRow[];
  lastHeartbeat: number;
  criticalAlerts: number;
}

export interface ActivityItem {
  id: string;
  ts: number;
  scope: string;
  text: string;
  level: 'info' | 'warning' | 'critical';
}

const unavailable = (reason: string) => ({ available: false as const, reason });

export function buildGlobalFinancialSummary(mission: MissionControlSnapshot | null): GlobalFinancialSummary {
  const noAgg = 'Aggregation not connected';
  const wallet = mission?.wallet;
  const walletReason = wallet && !wallet.available ? `Apixis Wallet: ${wallet.reason}` : noAgg;
  const today: Money = wallet?.available
    ? { available: true, amount: wallet.todayCashInUsd }
    : mission?.financial.revenueToday.available
      ? { available: true, amount: mission.financial.revenueToday.amount }
      : unavailable(mission?.financial.revenueToday.available === false ? mission.financial.revenueToday.reason : noAgg);
  const month: Money = wallet?.available
    ? { available: true, amount: wallet.netCashUsd }
    : unavailable(walletReason);
  return {
    source: wallet?.available ? 'partial' : today.available ? 'partial' : 'unavailable',
    totalCash: unavailable(noAgg),
    // Wallet is the one cash register: 30-day net cash in after refunds.
    totalRevenue: month,
    totalExpenses: unavailable(noAgg),
    totalProfit: unavailable(noAgg),
    totalInvestments: unavailable(noAgg),
    receivables: unavailable(noAgg),
    payables: wallet?.available
      ? { available: true, amount: wallet.unspentIxisUsd }
      : unavailable(walletReason),
    todayRevenue: today,
    monthRevenue: month,
    yearRevenue: unavailable(noAgg),
    profitMargin: unavailable(noAgg),
    momChange: unavailable(noAgg),
    ytdChange: unavailable(noAgg),
    series: wallet?.available ? wallet.dailyNetUsd : [],
  };
}

function statusFromSite(site: FleetSiteStatus | undefined): { status: ProjectStatusLabel; health: ProjectHealth } {
  if (!site) return { status: 'UNKNOWN', health: 'unknown' };
  if (!site.ok) return { status: 'OFFLINE', health: 'offline' };
  if (site.ms > 1500) return { status: 'ATTENTION', health: 'attention' };
  return { status: 'ONLINE', health: 'healthy' };
}

export function buildProjectRows(fleet: FleetSiteStatus[], mission: MissionControlSnapshot | null): ProjectRowData[] {
  return companyModules().map((m) => {
    const site = fleet.find((s) => s.slug === m.fleetSlug);
    const support = mission?.support.find((s) => s.slug === m.fleetSlug);
    const { status, health } = statusFromSite(site);
    return {
      slug: m.slug,
      name: m.name,
      route: m.route,
      url: m.url,
      accent: m.accent,
      glyph: m.glyph,
      status,
      health,
      latencyMs: site?.ms ?? null,
      supportAlias: support?.supportAlias ?? 'unavailable',
      openTickets: support?.openTickets ?? unavailable('No ticket source connected'),
    };
  });
}

export function buildSystemHealth(fleet: FleetSiteStatus[], mission: MissionControlSnapshot | null): SystemHealth {
  const down = fleet.filter((s) => !s.ok).length;
  const cixy = mission?.cixy.status;
  const rows: SystemHealthRow[] = [
    { name: 'Cixy / AI Brain', state: cixy === 'ready' ? 'online' : cixy === 'partial' ? 'degraded' : cixy ? 'offline' : 'unavailable', detail: mission?.cixy.provider },
    { name: 'AI Agents', state: mission?.ops.computer.workerConnected ? 'online' : 'offline', detail: mission?.ops.computer.halted ? 'halted' : undefined },
    { name: 'Database / Supabase', state: mission?.source === 'live' ? 'online' : 'unavailable' },
    { name: 'Company sites', state: fleet.length === 0 ? 'unavailable' : down === 0 ? 'online' : down < fleet.length ? 'degraded' : 'offline', detail: fleet.length ? `${fleet.length - down}/${fleet.length} up` : undefined },
    { name: 'Automations / Scheduler', state: mission?.cixy.cronPaused ? 'degraded' : 'online', detail: mission?.cixy.cronPaused ? 'cron paused' : undefined },
    { name: 'Market Data', state: 'unavailable', detail: 'not connected' },
    { name: 'News Feed', state: 'unavailable', detail: 'not connected' },
    { name: 'Security / Auth', state: mission?.support[0]?.authAdmin.available ? (mission.support[0].authAdmin.status === 'configured' ? 'online' : 'degraded') : 'unavailable', detail: mission?.ownerAdminEmail },
    { name: 'Background Workers', state: mission?.ops.computer.workerConnected && !mission.ops.computer.demo ? 'online' : 'offline' },
    { name: 'File Storage', state: 'unavailable', detail: 'not connected' },
  ];
  const offline = rows.filter((r) => r.state === 'offline').length;
  const degraded = rows.filter((r) => r.state === 'degraded').length;
  return {
    overall: !mission ? 'CHECKING' : offline > 0 ? 'ATTENTION REQUIRED' : degraded > 0 ? 'DEGRADED' : 'ALL SYSTEMS OPERATIONAL',
    rows,
    lastHeartbeat: mission?.checkedAt ?? 0,
    criticalAlerts: offline + down,
  };
}

export function buildActivity(fleet: FleetSiteStatus[], mission: MissionControlSnapshot | null): ActivityItem[] {
  const now = mission?.checkedAt ?? Date.now();
  const items: ActivityItem[] = [];
  for (const s of fleet.filter((x) => !x.ok)) {
    items.push({ id: `down-${s.slug}`, ts: now, scope: s.name, text: `Site returned ${s.httpStatus} — offline`, level: 'critical' });
  }
  if (mission) {
    items.push({ id: 'probe', ts: now, scope: 'Fleet', text: `Probed ${fleet.length} company sites, ${fleet.filter((x) => x.ok).length} up`, level: 'info' });
    if (mission.fleet.slowest) items.push({ id: 'slow', ts: now, scope: mission.fleet.slowest.name, text: `Slowest response ${mission.fleet.slowest.ms}ms`, level: mission.fleet.slowest.ms > 1500 ? 'warning' : 'info' });
    if (mission.cixy.cronPaused) items.push({ id: 'cron', ts: now, scope: 'Scheduler', text: 'Both cron jobs paused', level: 'warning' });
    if (mission.support[0]?.authAdmin.available && mission.support[0].authAdmin.status === 'missing') items.push({ id: 'admin', ts: now, scope: 'Auth', text: `${mission.ownerAdminEmail} not yet created in Supabase Auth`, level: 'warning' });
    if (mission.ops.openTasks.available) items.push({ id: 'tasks', ts: now, scope: 'Agents', text: `${mission.ops.openTasks.count} open agent tasks`, level: 'info' });
  }
  return items;
}
