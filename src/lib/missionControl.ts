import { companyOps, ownerAdminEmail } from '@/config/companyOps';
import type { ComputerStatus } from '@/lib/computerControl';
import { anthropicModel, isAnthropicCeoEnabled } from '@/lib/env';
import type { FleetSnapshot, FleetSiteStatus } from '@/lib/fleetProbe';
import { createServiceSupabase } from '@/lib/supabase/service';

export type Availability<T> = { available: true } & T | { available: false; reason: string };

export interface LiveOpsSnapshot {
  source: 'live' | 'unavailable';
  checkedAt: number;
  projects: Array<{ slug: string; status: string }>;
  openTasks: Availability<{ count: number }>;
  openTickets: Availability<{ count: number }>;
  revenueToday: Availability<{ amount: number }>;
  leadsToday: Availability<{ count: number }>;
  costs: Availability<{ monthlyUsd: number; paused: boolean }>;
  admin: Availability<{ email: string; status: 'configured' | 'missing' }>;
}

export interface MissionControlSnapshot {
  source: 'live' | 'unavailable';
  checkedAt: number;
  ownerAdminEmail: string;
  fleet: {
    up: number;
    total: number;
    down: string[];
    slowest: FleetSiteStatus | null;
  };
  support: Array<{
    slug: string;
    name: string;
    supportAlias: string;
    adminEmail: string;
    authAdmin: Availability<{ status: 'configured' | 'missing' }>;
    openTickets: Availability<{ count: number }>;
  }>;
  financial: {
    revenueToday: Availability<{ amount: number }>;
    leadsToday: Availability<{ count: number }>;
    costs: Availability<{ monthlyUsd: number; paused: boolean }>;
  };
  ops: {
    openTasks: Availability<{ count: number }>;
    computer: { workerConnected: boolean; halted: boolean; capabilities: string[]; demo: boolean };
  };
  cixy: ReturnType<typeof summarizeCixyReadiness> & { provider: string; model: string };
}

export function summarizeCixyReadiness(input: {
  anthropic: boolean;
  fleet: boolean;
  ops: boolean;
  computer: boolean;
}): { status: 'ready' | 'partial' | 'offline'; missing: string[] } {
  const missing: string[] = [];
  if (!input.anthropic) missing.push('Anthropic API key/provider');
  if (!input.fleet) missing.push('live fleet');
  if (!input.ops) missing.push('live ops database');
  if (!input.computer) missing.push('computer worker');
  return { status: missing.length === 0 ? 'ready' : missing.length === 4 ? 'offline' : 'partial', missing };
}

function unavailable(reason: string): { available: false; reason: string } {
  return { available: false, reason };
}

function slowestSite(sites: FleetSiteStatus[]): FleetSiteStatus | null {
  const liveSites = sites.filter((site) => site.ok);
  if (liveSites.length === 0) return null;
  return [...liveSites].sort((a, b) => b.ms - a.ms)[0] ?? null;
}

function startOfTodayIso(now = Date.now()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function readLiveOpsSnapshot(now: () => number = Date.now): Promise<LiveOpsSnapshot> {
  const checkedAt = now();
  const supabase = createServiceSupabase();
  if (!supabase) {
    return {
      source: 'unavailable',
      checkedAt,
      projects: [],
      openTasks: unavailable('SUPABASE_SERVICE_ROLE_KEY unavailable'),
      openTickets: unavailable('No ticket source connected'),
      revenueToday: unavailable('Supabase service role unavailable'),
      leadsToday: unavailable('Supabase service role unavailable'),
      costs: unavailable('No cost source connected'),
      admin: unavailable('Supabase auth admin unavailable'),
    };
  }

  const since = startOfTodayIso(checkedAt);
  const [projectsRes, tasksRes, leadsRes, salesRes, adminRes] = await Promise.all([
    supabase.from('projects').select('slug,status'),
    supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).in('status', ['queued', 'working', 'running', 'waiting_approval']),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('sales').select('amount').gte('created_at', since),
    supabase.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  const projects = projectsRes.error
    ? []
    : ((projectsRes.data ?? []) as Array<{ slug?: string | null; status?: string | null }>).flatMap((row) =>
        row.slug ? [{ slug: row.slug, status: row.status ?? 'unknown' }] : [],
      );

  const amount = salesRes.error
    ? null
    : ((salesRes.data ?? []) as Array<{ amount?: number | string | null }>).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const users = adminRes.data?.users ?? [];
  const adminFound = users.some((user) => user.email?.toLowerCase() === ownerAdminEmail);

  return {
    source: 'live',
    checkedAt,
    projects,
    openTasks: tasksRes.error ? unavailable(tasksRes.error.message) : { available: true, count: tasksRes.count ?? 0 },
    openTickets: unavailable('No ticket source connected'),
    revenueToday: salesRes.error ? unavailable(salesRes.error.message) : { available: true, amount: amount ?? 0 },
    leadsToday: leadsRes.error ? unavailable(leadsRes.error.message) : { available: true, count: leadsRes.count ?? 0 },
    costs: unavailable('No cost source connected'),
    admin: adminRes.error
      ? unavailable(adminRes.error.message)
      : { available: true, email: ownerAdminEmail, status: adminFound ? 'configured' : 'missing' },
  };
}

export function emptyMissionControlSnapshot(): MissionControlSnapshot {
  const reason = 'Mission Control has not checked live sources yet';
  return {
    source: 'unavailable',
    checkedAt: 0,
    ownerAdminEmail,
    fleet: { up: 0, total: 0, down: [], slowest: null },
    support: companyOps.map((company) => ({
      slug: company.slug,
      name: company.name,
      supportAlias: company.supportAlias,
      adminEmail: company.adminEmail,
      authAdmin: unavailable(reason),
      openTickets: unavailable(reason),
    })),
    financial: {
      revenueToday: unavailable(reason),
      leadsToday: unavailable(reason),
      costs: unavailable(reason),
    },
    ops: {
      openTasks: unavailable(reason),
      computer: { workerConnected: false, halted: false, capabilities: [], demo: true },
    },
    cixy: { status: 'offline', missing: ['live fleet', 'live ops database', 'computer worker'], provider: 'unknown', model: 'unknown' },
  };
}

export async function buildMissionControlSnapshot(input: {
  fleet: FleetSnapshot;
  computer: ComputerStatus;
  cixy?: { provider: string; enabled: boolean; model: string };
  liveOps?: LiveOpsSnapshot;
  now?: () => number;
}): Promise<MissionControlSnapshot> {
  const now = input.now ?? Date.now;
  const liveOps = input.liveOps ?? (await readLiveOpsSnapshot(now));
  const down = input.fleet.sites.filter((site) => !site.ok).map((site) => site.name);
  const slowest = slowestSite(input.fleet.sites);
  const cixyInput = input.cixy ?? {
    provider: isAnthropicCeoEnabled() ? 'anthropic' : 'demo',
    enabled: isAnthropicCeoEnabled(),
    model: anthropicModel(),
  };
  const readiness = summarizeCixyReadiness({
    anthropic: cixyInput.enabled,
    fleet: input.fleet.source === 'live',
    ops: liveOps.source === 'live',
    computer: input.computer.workerConnected && !input.computer.demo,
  });

  return {
    source: input.fleet.source === 'live' || liveOps.source === 'live' ? 'live' : 'unavailable',
    checkedAt: now(),
    ownerAdminEmail,
    fleet: {
      up: input.fleet.sites.filter((site) => site.ok).length,
      total: input.fleet.sites.length,
      down,
      slowest,
    },
    support: companyOps.map((company) => ({
      slug: company.slug,
      name: company.name,
      supportAlias: company.supportAlias,
      adminEmail: company.adminEmail,
      authAdmin: liveOps.admin.available
        ? { available: true, status: liveOps.admin.status }
        : unavailable(liveOps.admin.reason),
      openTickets: liveOps.openTickets.available
        ? { available: true, count: liveOps.openTickets.count }
        : unavailable(liveOps.openTickets.reason),
    })),
    financial: {
      revenueToday: liveOps.revenueToday,
      leadsToday: liveOps.leadsToday,
      costs: liveOps.costs,
    },
    ops: {
      openTasks: liveOps.openTasks,
      computer: {
        workerConnected: input.computer.workerConnected,
        halted: input.computer.halted,
        capabilities: input.computer.capabilities,
        demo: input.computer.demo,
      },
    },
    cixy: { ...readiness, provider: cixyInput.provider, model: cixyInput.model },
  };
}
