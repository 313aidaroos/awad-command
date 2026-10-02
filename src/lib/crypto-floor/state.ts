/**
 * Everything the Crypto Floor UI, the desk agents and Cixy need, read from the database only (no Alpaca call:
 * the 5-minute tick is the one Alpaca reader). Also maps the robot onto the floor art's Snapshot schema
 * (model.ts) so the existing desks, agents, events and replay views show real robot activity.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { desks as visualDesks, emptyMetrics, type FloorEvent, type Snapshot } from "@/crypto-floor/model";
import { anthropicApiKey } from "@/lib/env";
import { agentForEvent, deskAgents } from "./desks";
import { strategyCatalog } from "./lab";
import { buildBooks, emptyBook, markBook, tradeStats, type TradeStats } from "./ledger";
import { utcDay, watchLine } from "./market";
import { loadBaselines, loadDesks, loadExperiments, loadFilledOrders, loadParams, toOrderRow } from "./store";
import { STRATEGIES, effectiveParams } from "./strategies";
import type { ExperimentRow, OrderRow, Position, StrategyParams, WatchStat } from "./types";

export const TICK_EVERY_SEC = 300;

type Stats = Pick<TradeStats, "trades" | "wins" | "winRate" | "expectancy" | "profitFactor" | "realized" | "maxDrawdown">;
const lite = (s: TradeStats): Stats => ({ trades: s.trades, wins: s.wins, winRate: s.winRate, expectancy: s.expectancy, profitFactor: s.profitFactor, realized: s.realized, maxDrawdown: s.maxDrawdown });

export type RobotEventView = {
  id: string;
  ts: string;
  type: string;
  desk: string | null;
  strategy: string | null;
  symbol: string | null;
  side: string | null;
  qty: number | null;
  price: number | null;
  orderId: string | null;
  title: string;
  agent: string | null;
  agentRole: string;
  payload: Record<string, unknown>;
};

export type DeskView = {
  id: string;
  name: string;
  color: string;
  strategy: string;
  strategyLabel: string;
  summary: string;
  enabled: boolean;
  version: number;
  params: StrategyParams;
  capital: number;
  equity: number;
  startEquity: number | null;
  dayPnl: number | null;
  dayPnlPct: number | null;
  realizedPnl: number;
  unrealizedPnl: number;
  pausedUntil: string | null;
  pauseReason: string | null;
  positions: Position[];
  stats7d: Stats;
  statsAll: Stats;
  lastEvent: { ts: string; title: string } | null;
  agents: Array<{ name: string; role: string }>;
  /** REAL MONEY (Coinbase) for this desk. */
  live: { enabled: boolean; enabledAt: string | null; enabledBy: string | null; positions: Position[]; realizedPnl: number; unrealizedPnl: number; trades: number };
};

export type CoinbaseView = {
  configured: boolean;
  ok: boolean;
  error: string | null;
  canTrade: boolean;
  canTransfer: boolean;
  usdAvailable: number;
  totalUsd: number;
  holdings: Array<{ currency: string; available: number; hold: number; usdValue: number | null }>;
  enabledDesks: string[];
  blocked: string | null;
  exposureUsd: number;
  dayPnl: number;
  pnlNow: number;
  pausedUntil: string | null;
  limits: { maxTotalUsd: number; maxTradeUsd: number; dayLossUsd: number };
  asOf: string | null;
};

export type ExperimentView = ExperimentRow & { equity: number; returnPct: number; trades: number; winRate: number | null; open: number };

export type RobotState = {
  generatedAt: string;
  status: "RUNNING" | "STALE" | "HALTED" | "OFFLINE";
  lastTickAt: string | null;
  tickAgeSec: number | null;
  nextTickInSec: number | null;
  lastTickTitle: string | null;
  ticks24h: number;
  uptimePct: number;
  dataStale: boolean;
  dataStaleReason: string | null;
  dedicatedAccount: boolean | null;
  aiConnected: boolean;
  killSwitch: { halted: boolean; reason: string | null; at: string | null; by: string | null };
  floorPause: { until: string; reason: string | null } | null;
  limits: { dayLossPct: number; maxOpenPositionsTotal: number; maxOrdersPerTick: number };
  watching: WatchStat[];
  watchLine: string;
  account: { cash: number | null; equity: number | null; buyingPower: number | null } | null;
  floor: { capital: number; equity: number; startEquity: number | null; dayPnl: number | null; dayPnlPct: number | null; realizedPnl: number; unrealizedPnl: number; openPositions: number };
  desks: DeskView[];
  orders: OrderRow[];
  events: RobotEventView[];
  experiments: ExperimentView[];
  paramChanges: Array<{ created_at: string; desk: string | null; version: number | null; source: string; reason: string | null }>;
  report: { day: string; email_status: string; email_to: string | null; created_at: string; error: string | null } | null;
  catalog: ReturnType<typeof strategyCatalog>;
  /** REAL MONEY venue status (Coinbase), as of the last tick. */
  coinbase: CoinbaseView;
};

const iso = (ts: string) => {
  const t = Date.parse(ts);
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
};

export function toEventView(r: Record<string, unknown>): RobotEventView {
  const payload = (r.payload ?? {}) as Record<string, unknown>;
  const desk = (r.desk as string) ?? null;
  const agentRole = String(r.agent_role ?? "system");
  return {
    id: String(r.id),
    ts: iso(String(r.ts)),
    type: String(r.type),
    desk,
    strategy: (r.strategy as string) ?? null,
    symbol: (r.symbol as string) ?? null,
    side: (r.side as string) ?? null,
    qty: r.qty === null || r.qty === undefined ? null : Number(r.qty),
    price: r.price === null || r.price === undefined ? null : Number(r.price),
    orderId: (r.order_id as string) ?? null,
    title: String(payload.title ?? r.type),
    agent: (payload.agent as string) ?? agentForEvent(desk, agentRole),
    agentRole,
    payload,
  };
}

export async function loadRobotState(db: SupabaseClient, now = Date.now()): Promise<RobotState> {
  const day = utcDay(now);
  const [params, desks, experiments, filled, baselines, hb, ticks, eventsRes, ordersRes, changesRes, reportRes] = await Promise.all([
    loadParams(db),
    loadDesks(db),
    loadExperiments(db),
    loadFilledOrders(db),
    loadBaselines(db, day),
    db.from("crypto_floor_events").select("ts,payload").eq("type", "heartbeat").order("ts", { ascending: false }).limit(1),
    db.from("crypto_floor_events").select("id", { count: "exact", head: true }).eq("type", "heartbeat").gte("ts", new Date(now - 86_400_000).toISOString()),
    db.from("crypto_floor_events").select("*").neq("type", "heartbeat").order("ts", { ascending: false }).limit(120),
    db.from("crypto_floor_orders").select("*").order("created_at", { ascending: false }).limit(60),
    db.from("crypto_floor_param_changes").select("created_at,desk,version,source,reason").order("created_at", { ascending: false }).limit(12),
    db.from("crypto_floor_reports").select("day,email_status,email_to,created_at,error").order("day", { ascending: false }).limit(1),
  ]);
  const heartbeat = hb.data?.[0] ?? null;
  const hp = (heartbeat?.payload ?? {}) as Record<string, unknown>;
  const prices = new Map(Object.entries((hp.prices as Record<string, number>) ?? {}).map(([k, v]) => [k, Number(v)]));
  const watching = (hp.watching as WatchStat[]) ?? [];
  const lastTickAt = heartbeat ? iso(String(heartbeat.ts)) : null;
  const tickAgeSec = lastTickAt ? Math.round((now - Date.parse(lastTickAt)) / 1000) : null;
  const fresh = tickAgeSec !== null && tickAgeSec < 15 * 60;
  const books = buildBooks(filled);
  const events = (eventsRes.data ?? []).map(toEventView);
  const since7 = now - 7 * 86_400_000;

  const deskViews: DeskView[] = desks.map((d) => {
    const marked = markBook(books.get(d.id) ?? emptyBook(d.id), d.capital_usd, prices);
    const start = baselines.get(d.id) ?? null;
    const visual = visualDesks.find((x) => x.id === d.id);
    const last = events.find((e) => e.desk === d.id);
    const s = STRATEGIES[d.strategy];
    return {
      id: d.id,
      name: d.name,
      color: visual?.color ?? "#42d5ff",
      strategy: d.strategy,
      strategyLabel: s.label,
      summary: s.summary,
      enabled: d.enabled,
      version: d.version,
      params: effectiveParams(d.strategy, d.params),
      capital: d.capital_usd,
      equity: marked.equity,
      startEquity: start,
      dayPnl: start !== null ? marked.equity - start : null,
      dayPnlPct: start ? ((marked.equity - start) / start) * 100 : null,
      realizedPnl: marked.realizedPnl,
      unrealizedPnl: marked.unrealizedPnl,
      pausedUntil: d.paused_until && Date.parse(d.paused_until) > now ? d.paused_until : null,
      pauseReason: d.paused_until && Date.parse(d.paused_until) > now ? d.pause_reason : null,
      positions: marked.positions,
      stats7d: lite(tradeStats(marked.closedTrades, since7)),
      statsAll: lite(tradeStats(marked.closedTrades)),
      lastEvent: last ? { ts: last.ts, title: last.title } : null,
      agents: deskAgents(d.id).map((a) => ({ name: a.name, role: a.role })),
      live: (() => {
        const lm = markBook(books.get(`live:${d.id}`) ?? emptyBook(`live:${d.id}`), 0, prices);
        return { enabled: d.live_enabled === true, enabledAt: d.live_enabled_at ?? null, enabledBy: d.live_enabled_by ?? null, positions: lm.positions, realizedPnl: lm.realizedPnl, unrealizedPnl: lm.unrealizedPnl, trades: lm.closedTrades.length };
      })(),
    };
  });

  const expViews: ExperimentView[] = experiments.map((e) => {
    const m = markBook(books.get(`exp:${e.id}`) ?? emptyBook(`exp:${e.id}`), e.capital_usd, prices);
    const st = tradeStats(m.closedTrades);
    return { ...e, equity: m.equity, returnPct: ((m.equity - e.capital_usd) / e.capital_usd) * 100, trades: st.trades, winRate: st.winRate, open: m.positions.length };
  });

  const capital = deskViews.reduce((s, d) => s + d.capital, 0);
  const equity = deskViews.reduce((s, d) => s + d.equity, 0);
  const floorStart = baselines.get("floor") ?? null;
  const account = (hp.account as RobotState["account"]) ?? null;
  const ticks24h = ticks.count ?? 0;

  return {
    generatedAt: new Date(now).toISOString(),
    status: params.halted ? "HALTED" : !lastTickAt ? "OFFLINE" : fresh ? "RUNNING" : "STALE",
    lastTickAt,
    tickAgeSec,
    nextTickInSec: tickAgeSec === null ? null : Math.max(0, TICK_EVERY_SEC - (tickAgeSec % TICK_EVERY_SEC)),
    lastTickTitle: heartbeat ? String(hp.title ?? "") : null,
    ticks24h,
    uptimePct: Math.min(100, (ticks24h / 288) * 100),
    dataStale: hp.dataStale === true,
    dataStaleReason: (hp.dataStaleReason as string) ?? null,
    dedicatedAccount: typeof hp.dedicatedAccount === "boolean" ? hp.dedicatedAccount : null,
    aiConnected: anthropicApiKey().length > 0,
    killSwitch: { halted: params.halted, reason: params.halt_reason, at: params.halted_at, by: params.halted_by },
    floorPause: params.day_paused_until && Date.parse(params.day_paused_until) > now ? { until: params.day_paused_until, reason: params.day_pause_reason } : null,
    limits: { dayLossPct: params.halt_day_loss_pct, maxOpenPositionsTotal: params.max_open_positions_total, maxOrdersPerTick: params.max_orders_per_tick },
    watching,
    watchLine: watching.length ? watchLine(watching) : "",
    account,
    floor: {
      capital,
      equity,
      startEquity: floorStart,
      dayPnl: floorStart !== null ? equity - floorStart : null,
      dayPnlPct: floorStart ? ((equity - floorStart) / floorStart) * 100 : null,
      realizedPnl: deskViews.reduce((s, d) => s + d.realizedPnl, 0),
      unrealizedPnl: deskViews.reduce((s, d) => s + d.unrealizedPnl, 0),
      openPositions: deskViews.reduce((s, d) => s + d.positions.length, 0),
    },
    desks: deskViews,
    orders: (ordersRes.data ?? []).map(toOrderRow),
    events,
    experiments: expViews,
    paramChanges: changesRes.data ?? [],
    report: reportRes.data?.[0] ?? null,
    catalog: strategyCatalog(),
    coinbase: (() => {
      const c = (hp.coinbase ?? null) as Partial<CoinbaseView> | null;
      const liveExposure = deskViews.reduce((sum, d) => sum + d.live.positions.reduce((a, p) => a + p.qty * p.avgEntryPrice, 0), 0);
      return {
        configured: c?.configured === true,
        ok: c?.ok === true,
        error: c?.error ?? null,
        canTrade: c?.canTrade === true,
        canTransfer: c?.canTransfer === true,
        usdAvailable: Number(c?.usdAvailable ?? 0),
        totalUsd: Number(c?.totalUsd ?? 0),
        holdings: c?.holdings ?? [],
        enabledDesks: desks.filter((d) => d.live_enabled).map((d) => d.id),
        blocked: c?.blocked ?? null,
        exposureUsd: liveExposure,
        dayPnl: Number(c?.dayPnl ?? 0),
        pnlNow: deskViews.reduce((sum, d) => sum + d.live.realizedPnl + d.live.unrealizedPnl, 0),
        pausedUntil: params.live_paused_until && Date.parse(params.live_paused_until) > now ? params.live_paused_until : null,
        limits: { maxTotalUsd: params.live_max_total_usd, maxTradeUsd: params.live_max_trade_usd, dayLossUsd: params.live_day_loss_usd },
        asOf: c ? lastTickAt : null,
      };
    })(),
  };
}

const EVENT_MAP: Record<string, FloorEvent["eventType"]> = {
  order_submitted: "ORDER_SUBMITTED",
  order_filled: "ORDER_FILLED",
  order_rejected: "ORDER_FAILED",
  order_canceled: "ORDER_CANCELLED",
  shadow_fill: "ORDER_FILLED",
  halt: "TEAM_FROZEN",
  resume: "TEAM_UNFROZEN",
  kill_switch: "KILL_SWITCH_TRIGGERED",
  kill_reset: "KILL_SWITCH_RESET",
  review: "DAILY_SUMMARY_CREATED",
  report: "DAILY_SUMMARY_CREATED",
  param_change: "CONFIG_CHANGED",
  live_switch: "CONFIG_CHANGED",
  experiment: "THESIS_CREATED",
  data_stale: "MARKET_DATA_STALE",
  system: "ENGINE_OFFLINE",
};

export function toFloorEvent(e: RobotEventView): FloorEvent {
  let eventType: FloorEvent["eventType"] = EVENT_MAP[e.type] ?? "SIGNAL_DETECTED";
  if (e.type === "signal") {
    eventType = e.side === "buy" ? "SIGNAL_DETECTED" : /stop/i.test(e.title) ? "STOP_TRIGGERED" : "TARGET_TRIGGERED";
  }
  const severity: FloorEvent["severity"] =
    e.type === "kill_switch" ? "critical" : ["order_rejected", "halt", "data_stale", "system"].includes(e.type) ? "warning" : "info";
  return {
    id: e.id,
    timestamp: e.ts,
    teamId: e.desk,
    agentId: e.agent,
    eventType,
    symbol: e.symbol,
    tradeId: e.orderId,
    orderId: e.orderId,
    severity,
    title: e.title.length > 140 ? `${e.title.slice(0, 137)}…` : e.title,
    description: e.title,
    mode: "PAPER",
    correlationId: e.orderId ?? e.id,
    source: "crypto-floor robot",
    payload: { ...e.payload, sim: e.type === "shadow_fill" ? true : e.payload.sim ?? false, reason: e.payload.reason ?? undefined },
  };
}

/** The robot, expressed in the floor art's Snapshot schema (validated by snapshotSchema in the UI). */
export function toFloorSnapshot(s: RobotState): Snapshot {
  const now = s.generatedAt;
  const health: Snapshot["health"] = [
    { name: "Robot (5-min tick)", status: s.status === "RUNNING" || s.status === "HALTED" ? "ONLINE" : s.lastTickAt ? "STALE" : "OFFLINE", detail: s.lastTickAt ? `Last tick ${Math.round((s.tickAgeSec ?? 0) / 60)} min ago · ${s.ticks24h} ticks/24h` : "No tick recorded" },
    { name: "Alpaca paper", status: s.account ? "ONLINE" : "UNKNOWN", detail: s.account ? `Account equity $${(s.account.equity ?? 0).toFixed(2)} · cash $${(s.account.cash ?? 0).toFixed(2)}` : "No account read yet" },
    { name: "Market data", status: !s.lastTickAt ? "UNKNOWN" : s.dataStale ? "STALE" : "ONLINE", detail: s.dataStale ? s.dataStaleReason ?? "Stale" : s.watchLine || "—" },
    { name: "Supabase event store", status: "ONLINE", detail: `${s.events.length} recent events` },
    { name: "AI provider (desk chat)", status: s.aiConnected ? "ONLINE" : "OFFLINE", detail: s.aiConnected ? "Desk leads can answer" : "ANTHROPIC_API_KEY not set" },
    { name: "Daily email", status: s.report?.email_status === "sent" ? "ONLINE" : s.report ? "STALE" : "UNKNOWN", detail: s.report ? `${s.report.day}: ${s.report.email_status}${s.report.error ? ` (${s.report.error.slice(0, 80)})` : ""}` : "First brief goes out at 13:00 UTC" },
    { name: "Coinbase (real money)", status: s.coinbase.ok ? "ONLINE" : s.coinbase.configured ? "STALE" : "UNKNOWN", detail: !s.coinbase.configured ? "Not connected — add COINBASE_API_KEY_NAME / COINBASE_API_PRIVATE_KEY" : s.coinbase.ok ? `$${s.coinbase.totalUsd.toFixed(2)} · real money ${s.coinbase.enabledDesks.length ? `ON for ${s.coinbase.enabledDesks.join(", ")}` : "OFF"}${s.coinbase.canTransfer ? " · KEY CAN TRANSFER — trading refused" : ""}` : `Error: ${s.coinbase.error ?? "unknown"}` },
    { name: "Account isolation", status: s.dedicatedAccount ? "ONLINE" : s.dedicatedAccount === false ? "STALE" : "UNKNOWN", detail: s.dedicatedAccount ? "Floor has its own paper account" : "Shares AwadBot's paper account — desks use their own ledgers" },
  ];
  const teams: Snapshot["teams"] = visualDesks.map((vd) => {
    const d = s.desks.find((x) => x.id === vd.id);
    if (!d) {
      return { id: vd.id, status: "PAPER LEAGUE", mode: "PAPER", metrics: { ...emptyMetrics }, pnl: null, openTrades: 0, risk: "UNKNOWN" };
    }
    const frozen = !d.enabled || d.pausedUntil !== null || s.killSwitch.halted;
    return {
      id: d.id,
      status: frozen ? "FROZEN" : "PAPER LEAGUE",
      mode: "PAPER",
      metrics: {
        ...emptyMetrics,
        netReturn: ((d.equity - d.capital) / d.capital) * 100,
        winRate: d.statsAll.winRate,
        maxDrawdown: d.statsAll.trades ? Math.round((d.statsAll.maxDrawdown / d.capital) * 10_000) / 100 : null,
        profitFactor: d.statsAll.profitFactor,
        tradeCount: d.statsAll.trades,
      },
      pnl: d.equity - d.capital,
      openTrades: d.positions.length,
      risk: frozen ? "FROZEN" : d.positions.length >= 3 ? "HIGH" : d.positions.length ? "MODERATE" : "LOW",
    };
  });
  return {
    timestamp: now,
    source: "Crypto Floor robot · Alpaca paper",
    engine: s.killSwitch.halted ? "HALTED" : s.status === "RUNNING" ? "ONLINE" : "OFFLINE",
    health,
    teams,
    events: s.events.slice(0, 200).map(toFloorEvent).reverse(),
    markets: s.watching
      .filter((w) => w.price && w.price > 0)
      .map((w) => ({ symbol: w.symbol.split("/")[0], price: w.price as number, change: w.ret24h ?? 0, timestamp: iso(w.priceAt ?? now) })),
    portfolio: {
      paperBalance: s.floor.equity,
      liveBalance: s.coinbase.ok ? s.coinbase.totalUsd : null,
      paperPnl: s.floor.dayPnl,
      livePnl: s.coinbase.enabledDesks.length || s.coinbase.exposureUsd > 0 ? s.coinbase.pnlNow : null,
      openPositions: s.floor.openPositions,
    },
    killSwitch: { halted: s.killSwitch.halted, reason: s.killSwitch.reason, timestamp: s.killSwitch.at, triggeredBy: s.killSwitch.by },
    regime: null,
    queueDepth: s.orders.filter((o) => ["pending_submit", "submitted", "partially_filled", "unknown"].includes(o.status)).length,
    openOrders: s.orders.filter((o) => ["submitted", "partially_filled"].includes(o.status)).length,
    latencyMs: null,
    uptimePct: Math.round(s.uptimePct * 10) / 10,
    lastCycle: s.lastTickAt,
  };
}
