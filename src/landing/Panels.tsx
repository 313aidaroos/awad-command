"use client";

import Link from "next/link";
import { ArrowRight, Database, ChartNoAxesCombined, Heart } from "lucide-react";
import { ModuleIcon } from "@/landing/ModuleIcon";
import { useState } from "react";
import type {
  ActivityItem,
  GlobalFinancialSummary,
  Money,
  ProjectRowData,
  SystemHealth,
} from "@/lib/dashboardData";
import {
  CommandButton,
  Led,
  type LedTone,
  MetricCard,
  RetroPanel,
  StatusBadge,
  Unavailable,
} from "@/landing/primitives";
import { requestCeoOpen } from "@/lib/ceoBridge";
import { clock, money, relativeTime } from "@/lib/format";
import type { MissionControlSnapshot } from "@/lib/missionControl";

const RANGES = ["1D", "7D", "1M", "3M", "1Y", "ALL"] as const;

function fmt(m: Money): string {
  return m.available ? money(m.amount) : "unavailable";
}

export function GlobalFinancialOverview({
  summary,
  compact = false,
}: {
  summary: GlobalFinancialSummary;
  compact?: boolean;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1M");
  const cells: Array<[string, Money]> = [
    ["TOTAL CASH", summary.totalCash],
    ["TOTAL REVENUE", summary.totalRevenue],
    ["TOTAL EXPENSES", summary.totalExpenses],
    ["TOTAL PROFIT", summary.totalProfit],
    ["TODAY", summary.todayRevenue],
    ["MONTH", summary.monthRevenue],
    ["YTD", summary.yearRevenue],
    ["INVESTMENTS", summary.totalInvestments],
  ];
  if (compact)
    return (
      <RetroPanel
        title="AWAD ECOSYSTEM FINANCES"
        className="hq-finances"
        right={
          <StatusBadge
            label={summary.source}
            tone={
              summary.source === "live"
                ? "green"
                : summary.source === "partial"
                  ? "amber"
                  : "off"
            }
          />
        }
      >
        <div className="hq-finance-metrics">
          {(
            [
              ["TOTAL REVENUE", summary.totalRevenue],
              ["TOTAL EXPENSES", summary.totalExpenses],
              ["TOTAL PROFIT", summary.totalProfit],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong title={value.available ? undefined : value.reason}>
                {value.available ? money(value.amount) : "—"}
              </strong>
              <small>
                {value.available ? "Connected source" : "Not connected"}
              </small>
            </div>
          ))}
        </div>
        <FinancialChart series={summary.series} range={range} />
        <div className="hq-finance-secondary">
          {(
            [
              ["TOTAL CASH", summary.totalCash],
              ["TODAY / REVENUE", summary.todayRevenue],
              ["THIS MONTH", summary.monthRevenue],
              ["YTD REVENUE", summary.yearRevenue],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b title={value.available ? undefined : value.reason}>
                {value.available ? money(value.amount) : "—"}
              </b>
            </div>
          ))}
        </div>
        <div className="hq-finance-ranges">
          {RANGES.map((r) => (
            <button
              type="button"
              key={r}
              aria-pressed={range === r}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="hq-finance-note">
          All-company aggregation ·{" "}
          {summary.source === "live"
            ? "Connected financial sources"
            : summary.source === "partial"
              ? "Partial source available; combined totals not connected"
              : "Combined ledger not connected"}{" "}
          · No sample totals
        </p>
      </RetroPanel>
    );
  return (
    <RetroPanel
      title="AWAD ECOSYSTEM FINANCES"
      right={
        <StatusBadge
          label={summary.source}
          tone={
            summary.source === "live"
              ? "green"
              : summary.source === "partial"
                ? "amber"
                : "off"
          }
        />
      }
      className="lg:col-span-2"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cells.map(([label, m]) => (
          <MetricCard
            key={label}
            label={label}
            value={fmt(m)}
            tone={m.available ? "flat" : undefined}
            hint={m.available ? undefined : m.reason}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2 py-1 text-[10px] tracking-[0.12em] ${range === r ? "bg-[var(--panel-2)] text-[var(--amber)]" : "text-[var(--muted)]"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[var(--muted)]">
          margin{" "}
          {summary.profitMargin.available
            ? `${summary.profitMargin.pct}%`
            : "unavailable"}{" "}
          · MoM{" "}
          {summary.momChange.available
            ? `${summary.momChange.pct}%`
            : "unavailable"}
        </span>
      </div>
      <FinancialChart series={summary.series} range={range} />
      <p className="mt-2 text-[10px] text-[var(--muted)]">
        Aggregates every company connected to Command. Company-level ledgers
        stay in their own Supabase schema; totals are computed server-side. Not
        yet connected — no numbers are invented.
      </p>
    </RetroPanel>
  );
}

function FinancialChart({
  series,
  range,
}: {
  series: number[];
  range: string;
}) {
  if (series.length < 2) {
    return (
      <div className="mt-3 grid h-28 place-items-center border border-dashed border-[var(--line)] text-[10px] tracking-[0.14em] text-[var(--muted)]">
        {range} · CHART UNAVAILABLE UNTIL LEDGER AGGREGATION IS CONNECTED
      </div>
    );
  }
  const max = Math.max(...series);
  const min = Math.min(...series);
  const pts = series
    .map(
      (v, i) =>
        `${(i / (series.length - 1)) * 100},${100 - ((v - min) / (max - min || 1)) * 100}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="mt-3 h-28 w-full border border-[var(--line)]"
    >
      <polyline
        fill="none"
        stroke="var(--green)"
        strokeWidth="1.2"
        points={pts}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const STATUS_TONE: Record<ProjectRowData["status"], LedTone> = {
  ONLINE: "green",
  BUILDING: "blue",
  DEVELOPMENT: "amber",
  PAUSED: "off",
  ATTENTION: "amber",
  OFFLINE: "red",
  UNKNOWN: "off",
};

export function ProjectStatusPanel({
  rows,
  loading,
  compact = false,
}: {
  rows: ProjectRowData[];
  loading: boolean;
  compact?: boolean;
}) {
  if (compact)
    return (
      <RetroPanel
        title="ACTIVE PROJECTS"
        className="hq-projects"
        right={
          <span className="hq-panel-meta">
            {rows.filter((r) => r.status === "ONLINE").length}/{rows.length}{" "}
            online
          </span>
        }
      >
        <div
          className="hq-scroll-rows"
          tabIndex={0}
          aria-label="All project statuses"
        >
          {rows.map((r) => (
            <Link key={r.slug} href={r.route} className="hq-project-row">
              <span style={{ color: r.accent }}>
                <ModuleIcon id={r.slug} size={15} />
              </span>
              <span>{r.name}</span>
              <StatusBadge
                label={
                  loading && r.status === "UNKNOWN" ? "CHECKING" : r.status
                }
                tone={STATUS_TONE[r.status]}
              />
            </Link>
          ))}
        </div>
        <Link className="hq-panel-link" href="/projects">
          VIEW ALL PROJECTS <ArrowRight size={13} />
        </Link>
      </RetroPanel>
    );
  return (
    <RetroPanel
      title="ACTIVE PROJECTS"
      right={
        <span className="font-num text-[10px] text-[var(--muted)]">
          {rows.filter((r) => r.status === "ONLINE").length}/{rows.length}{" "}
          online
        </span>
      }
    >
      <ul className="divide-y divide-[var(--line)]">
        {rows.map((r) => (
          <li key={r.slug}>
            <Link
              href={r.route}
              className="grid grid-cols-[18px_1fr_auto_auto] items-center gap-3 py-2 text-[12px] hover:bg-[var(--panel-2)]"
            >
              <span style={{ color: r.accent }}>{r.glyph}</span>
              <span className="truncate">
                {r.name}
                <span className="ml-2 text-[10px] text-[var(--muted)]">
                  {r.url ? r.url.replace("https://", "") : ""}
                </span>
              </span>
              <span className="font-num text-[10px] text-[var(--muted)]">
                {r.latencyMs !== null
                  ? `${r.latencyMs}ms`
                  : loading
                    ? "…"
                    : "—"}
              </span>
              <StatusBadge label={r.status} tone={STATUS_TONE[r.status]} />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <CommandButton href="/projects">VIEW ALL PROJECTS →</CommandButton>
      </div>
    </RetroPanel>
  );
}

const HEALTH_TONE: Record<SystemHealth["rows"][number]["state"], LedTone> = {
  online: "green",
  degraded: "amber",
  offline: "red",
  unavailable: "off",
};

export function SystemHealthPanel({
  health,
  compact = false,
}: {
  health: SystemHealth;
  compact?: boolean;
}) {
  const overallTone: LedTone =
    health.overall === "ALL SYSTEMS OPERATIONAL"
      ? "green"
      : health.overall === "CHECKING"
        ? "off"
        : health.overall === "DEGRADED"
          ? "amber"
          : "red";
  if (compact)
    return (
      <RetroPanel
        title="SYSTEM STATUS"
        className="hq-health"
        right={<Led tone={overallTone} />}
      >
        <p className="hq-overall" data-tone={overallTone}>
          {health.overall}
        </p>
        <div
          className="hq-scroll-rows"
          tabIndex={0}
          aria-label="All service statuses"
        >
          {health.rows.map((r) => (
            <div className="hq-service-row" key={r.name} title={r.detail}>
              <Led tone={HEALTH_TONE[r.state]} />
              <span>{r.name}</span>
              <span data-state={r.state}>{r.state}</span>
            </div>
          ))}
        </div>
        <div className="hq-heartbeat">
          Heartbeat {health.lastHeartbeat ? clock(health.lastHeartbeat) : "—"} ·{" "}
          {health.criticalAlerts} critical
        </div>
      </RetroPanel>
    );
  return (
    <RetroPanel
      title="SYSTEM STATUS"
      right={<StatusBadge label={health.overall} tone={overallTone} />}
    >
      <ul className="space-y-1.5 text-[11px]">
        {health.rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Led tone={HEALTH_TONE[r.state]} />
              {r.name}
            </span>
            <span className="font-num text-[10px] text-[var(--muted)]">
              {r.detail ?? r.state}
            </span>
          </li>
        ))}
      </ul>
      <div className="font-num mt-3 flex justify-between border-t border-[var(--line)] pt-2 text-[10px] text-[var(--muted)]">
        <span>
          heartbeat {health.lastHeartbeat ? clock(health.lastHeartbeat) : "—"}
        </span>
        <span className={health.criticalAlerts ? "text-[var(--red)]" : ""}>
          {health.criticalAlerts} critical
        </span>
      </div>
    </RetroPanel>
  );
}

export function CixyPanel({
  mission,
  rows,
}: {
  mission: MissionControlSnapshot | null;
  rows: ProjectRowData[];
}) {
  const attention = rows.filter(
    (r) => r.status !== "ONLINE" && r.status !== "UNKNOWN",
  ).length;
  const assessment = mission
    ? [
        `${rows.length} companies tracked. ${attention} require attention.`,
        `Fleet ${mission.fleet.up}/${mission.fleet.total} up${mission.fleet.slowest ? `, slowest ${mission.fleet.slowest.name} ${mission.fleet.slowest.ms}ms` : ""}.`,
        `Cixy core ${mission.cixy.status} on ${mission.cixy.provider}. Scheduler ${mission.cixy.cronPaused ? "paused" : "running"}.`,
        `Revenue today ${mission.financial.revenueToday.available ? money(mission.financial.revenueToday.amount) : "unavailable"}.`,
      ]
    : ["Waiting for live snapshot…"];
  return (
    <RetroPanel
      title="CIXY"
      right={
        <span className="text-[10px] tracking-[0.14em] text-[var(--muted)]">
          AWAD COMMAND AI
        </span>
      }
    >
      <ul className="space-y-1 text-[12px] leading-relaxed">
        {assessment.map((l) => (
          <li key={l}>› {l}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <CommandButton onClick={requestCeoOpen} primary>
          ASK CIXY
        </CommandButton>
        <CommandButton href="/command?panel=briefing">
          VIEW DAILY BRIEF
        </CommandButton>
        <CommandButton href="/strategy">RECOMMENDATIONS</CommandButton>
      </div>
    </RetroPanel>
  );
}

export function QuickCommands() {
  const items: Array<{ label: string; href?: string; onClick?: () => void }> = [
    { label: "Ask Cixy", onClick: requestCeoOpen },
    { label: "Create Project", href: "/projects?new=1" },
    { label: "Launch Agent", href: "/agents" },
    { label: "Open Crypto Floor", href: "/crypto-floor" },
    { label: "Create Content", href: "/content" },
    { label: "Review Finances", href: "/analytics" },
    { label: "Review Tasks", href: "/command?panel=approval" },
    { label: "System Health", href: "/system" },
    { label: "Add Note", href: "/strategy" },
    { label: "Run Daily Brief", href: "/command?panel=briefing" },
  ];
  return (
    <RetroPanel title="QUICK COMMANDS">
      <div className="grid grid-cols-2 gap-2">
        {items.map((i) => (
          <CommandButton key={i.label} href={i.href} onClick={i.onClick}>
            {i.label}
          </CommandButton>
        ))}
      </div>
    </RetroPanel>
  );
}

export function NewsFeed({ compact = false }: { compact?: boolean } = {}) {
  if (compact)
    return (
      <RetroPanel
        title="NEWS FEED"
        className="hq-news"
        right={
          <Link className="hq-panel-meta" href="/news">
            View all →
          </Link>
        }
      >
        <div className="hq-news-empty">
          <span className="hq-news-symbol">≋</span>
          <h3>Awaiting intelligence feed</h3>
          <p>
            No news provider is connected. Your dashboard will show stories here
            when a source is available.
          </p>
          <span>
            AI · MARKETS · CRYPTO
            <br />
            TECHNOLOGY · BUSINESS
          </span>
        </div>
        <Link className="hq-panel-link" href="/news">
          OPEN NEWS ROOM <ArrowRight size={13} />
        </Link>
      </RetroPanel>
    );

  return (
    <RetroPanel
      title="NEWS FEED"
      right={<StatusBadge label="not connected" tone="off" />}
    >
      <p className="text-[11px] text-[var(--muted)]">
        No news provider is connected yet. Nothing is shown rather than
        placeholder headlines.
      </p>
      <p className="mt-1 text-[10px] text-[var(--muted)]">
        TODO(integration): AI · Markets · Crypto · Technology · Business ·
        Company-specific.
      </p>
      <div className="mt-3">
        <CommandButton href="/news">VIEW ALL →</CommandButton>
      </div>
    </RetroPanel>
  );
}

const LEVEL_TONE: Record<ActivityItem["level"], LedTone> = {
  info: "blue",
  warning: "amber",
  critical: "red",
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <RetroPanel title="RECENT ACTIVITY">
      {items.length === 0 ? (
        <p className="text-[11px] text-[var(--muted)]">No events yet.</p>
      ) : null}
      <ul className="space-y-1.5 text-[11px]">
        {items.map((i) => (
          <li
            key={i.id}
            className="grid grid-cols-[10px_auto_1fr_auto] items-baseline gap-2"
          >
            <Led tone={LEVEL_TONE[i.level]} />
            <span className="text-[var(--muted)]">{i.scope}</span>
            <span className="truncate">{i.text}</span>
            <span className="font-num text-[10px] text-[var(--muted)]">
              {relativeTime(i.ts)}
            </span>
          </li>
        ))}
      </ul>
    </RetroPanel>
  );
}

export function ProjectHealthGrid({ rows }: { rows: ProjectRowData[] }) {
  const label: Record<ProjectRowData["health"], string> = {
    healthy: "Healthy",
    attention: "Needs Attention",
    building: "Building",
    development: "Development",
    offline: "Offline",
    unknown: "Checking",
  };
  const tone: Record<ProjectRowData["health"], LedTone> = {
    healthy: "green",
    attention: "amber",
    building: "blue",
    development: "amber",
    offline: "red",
    unknown: "off",
  };
  return (
    <RetroPanel title="PROJECT HEALTH" className="lg:col-span-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {rows.map((r) => (
          <Link
            key={r.slug}
            href={r.route}
            className="border border-[var(--line)] bg-[var(--panel-2)] p-3 hover:border-[var(--line-2)]"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span>{r.name}</span>
              <span style={{ color: r.accent }}>{r.glyph}</span>
            </div>
            <div className="mt-2">
              <StatusBadge label={label[r.health]} tone={tone[r.health]} />
            </div>
            <div className="font-num mt-1 text-[10px] text-[var(--muted)]">
              tickets{" "}
              {r.openTickets.available ? (
                r.openTickets.count
              ) : (
                <Unavailable reason={r.openTickets.reason} />
              )}
            </div>
          </Link>
        ))}
      </div>
    </RetroPanel>
  );
}

export function DailyBrief({
  mission,
  rows,
}: {
  mission: MissionControlSnapshot | null;
  rows: ProjectRowData[];
}) {
  const need = rows.filter(
    (r) => r.status !== "ONLINE" && r.status !== "UNKNOWN",
  );
  const fastest = [...rows]
    .filter((r) => r.latencyMs !== null)
    .sort((a, b) => (a.latencyMs ?? 0) - (b.latencyMs ?? 0))[0];
  const lines: Array<[string, string]> = [
    [
      "Revenue change",
      mission?.financial.revenueToday.available
        ? `${money(mission.financial.revenueToday.amount)} today`
        : "unavailable",
    ],
    ["Expenses", "unavailable"],
    [
      "System alerts",
      mission ? `${mission.fleet.down.length} site(s) down` : "—",
    ],
    [
      "Top-performing",
      fastest ? `${fastest.name} (${fastest.latencyMs}ms)` : "—",
    ],
    [
      "Needs attention",
      need.length ? need.map((r) => r.name).join(", ") : "none",
    ],
    ["Crypto Floor", "not connected"],
    [
      "Pending decisions",
      mission?.ops.openTasks.available
        ? `${mission.ops.openTasks.count} open tasks`
        : "unavailable",
    ],
    [
      "Agent activity",
      mission?.ops.computer.workerConnected
        ? "worker online"
        : "worker offline",
    ],
  ];
  return (
    <RetroPanel title="DAILY COMMAND BRIEF">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[11px]">
        {lines.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-[var(--muted)]">{k}</dt>
            <dd className="truncate">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3">
        <CommandButton href="/command?panel=briefing">
          OPEN FULL BRIEF →
        </CommandButton>
      </div>
    </RetroPanel>
  );
}

export function BuildScaleImpact() {
  const cards = [
    {
      title: "BUILD",
      description: "Turn ideas into real companies with AI agents.",
      href: "/projects",
      Icon: Database,
    },
    {
      title: "SCALE",
      description: "Automate, optimize, and grow across global markets.",
      href: "/automations",
      Icon: ChartNoAxesCombined,
    },
    {
      title: "IMPACT",
      description: "Create opportunity, build wealth, and give back.",
      href: "/strategy",
      Icon: Heart,
    },
  ];
  return (
    <section
      className="hq-features"
      id="hq-principles"
      aria-label="Operating principles"
    >
      {cards.map(({ title, description, href, Icon }) => (
        <Link key={title} href={href}>
          <Icon size={32} />
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <ArrowRight size={20} />
        </Link>
      ))}
    </section>
  );
}
