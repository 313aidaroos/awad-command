import { z } from "zod";

export const roles = ["Scout", "Analyst", "Trader", "Risk Officer"] as const;
export const desks = [
  {
    id: "samurai",
    name: "SAMURAI",
    strategy: "Trend / Momentum",
    color: "#ff556d",
    symbol: "侍",
    names: ["KAI", "HIRO", "REN", "AKIRA"],
  },
  {
    id: "neon",
    name: "NEON",
    strategy: "Mean Reversion",
    color: "#29c8ff",
    symbol: "光",
    names: ["YUKI", "SORA", "NOVA", "REI"],
  },
  {
    id: "orbit",
    name: "ORBIT",
    strategy: "Swing Trading",
    color: "#40ef8e",
    symbol: "星",
    names: ["ATLAS", "LUNA", "SOL", "VEGA"],
  },
  {
    id: "phantom",
    name: "PHANTOM",
    strategy: "News / Event Driven",
    color: "#be6dff",
    symbol: "影",
    names: ["ECHO", "MIRA", "ZERO", "SAGE"],
  },
] as const;
export type Desk = (typeof desks)[number];
export const eventTypes = [
  "SIGNAL_DETECTED",
  "PATTERN_DETECTED",
  "NEWS_DETECTED",
  "THESIS_CREATED",
  "ORDER_PROPOSED",
  "RISK_APPROVED",
  "RISK_REJECTED",
  "AI_VETOED",
  "AI_VETO_APPROVED",
  "GUARDRAIL_APPROVED",
  "GUARDRAIL_REJECTED",
  "ORDER_SUBMITTED",
  "ORDER_ACCEPTED",
  "ORDER_PARTIALLY_FILLED",
  "ORDER_FILLED",
  "ORDER_CANCELLED",
  "ORDER_FAILED",
  "STOP_TRIGGERED",
  "TARGET_TRIGGERED",
  "PROFIT_TARGET_HIT",
  "TEAM_PROMOTED",
  "TEAM_DEMOTED",
  "TEAM_FROZEN",
  "TEAM_UNFROZEN",
  "ENGINE_STARTED",
  "ENGINE_STOPPED",
  "ENGINE_OFFLINE",
  "MARKET_DATA_STALE",
  "EXCHANGE_DISCONNECTED",
  "EXCHANGE_RECONNECTED",
  "KILL_SWITCH_TRIGGERED",
  "KILL_SWITCH_RESET",
  "RISK_LIMIT_CHANGED",
  "CONFIG_CHANGED",
  "DAILY_SUMMARY_CREATED",
] as const;
export const lifecycle = [
  "PAPER LEAGUE",
  "LIVE CANDIDATE",
  "LIVE TEAM",
  "CHAMPION",
  "DEMOTED",
  "FROZEN",
] as const;
export const metricNames = [
  "netReturn",
  "slippageEfficiency",
  "maxDrawdown",
  "sharpe",
  "sortino",
  "winRate",
  "profitFactor",
  "averageWin",
  "averageLoss",
  "consistency",
  "tradeCount",
  "btcAlpha",
  "uptime",
  "violations",
  "turnover",
  "feeEfficiency",
] as const;
export type MetricName = (typeof metricNames)[number];
export type Metrics = Record<MetricName, number | null>;
export const emptyMetrics = Object.fromEntries(
  metricNames.map((k) => [k, null]),
) as Metrics;
export const eventSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  teamId: z.string().nullable(),
  agentId: z.string().nullable(),
  eventType: z.enum(eventTypes),
  symbol: z.string().nullable(),
  tradeId: z.string().nullable(),
  orderId: z.string().nullable(),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string(),
  description: z.string(),
  mode: z.enum(["PAPER", "LIVE"]),
  correlationId: z.string(),
  source: z.string(),
  payload: z.record(z.unknown()).default({}),
});
export type FloorEvent = z.infer<typeof eventSchema>;
export const teamSchema = z.object({
  id: z.string(),
  status: z.enum(lifecycle),
  mode: z.enum(["PAPER", "LIVE"]),
  metrics: z.object(
    Object.fromEntries(
      metricNames.map((k) => [k, z.number().finite().nullable()]),
    ) as Record<MetricName, z.ZodNullable<z.ZodNumber>>,
  ),
  pnl: z.number().finite().nullable(),
  openTrades: z.number().int().nonnegative(),
  risk: z.enum(["UNKNOWN", "LOW", "MODERATE", "HIGH", "FROZEN"]),
});
export type TeamState = z.infer<typeof teamSchema>;
export const snapshotSchema = z.object({
  timestamp: z.string().datetime(),
  source: z.string(),
  engine: z.enum(["ONLINE", "OFFLINE", "RECONCILING", "HALTED"]),
  health: z.array(
    z.object({
      name: z.string(),
      status: z.enum(["ONLINE", "OFFLINE", "STALE", "UNKNOWN"]),
      detail: z.string(),
    }),
  ),
  teams: z.array(teamSchema),
  events: z.array(eventSchema).max(1000),
  markets: z.array(
    z.object({
      symbol: z.string(),
      price: z.number().positive(),
      change: z.number().finite(),
      timestamp: z.string().datetime(),
    }),
  ),
  portfolio: z.object({
    paperBalance: z.number().finite().nullable(),
    liveBalance: z.number().finite().nullable(),
    paperPnl: z.number().finite().nullable(),
    livePnl: z.number().finite().nullable(),
    openPositions: z.number().int().nonnegative().nullable(),
  }),
  killSwitch: z.object({
    halted: z.boolean(),
    reason: z.string().nullable(),
    timestamp: z.string().nullable(),
    triggeredBy: z.string().nullable(),
  }),
  regime: z.string().nullable(),
  queueDepth: z.number().int().nonnegative().nullable(),
  openOrders: z.number().int().nonnegative().nullable(),
  latencyMs: z.number().nonnegative().nullable(),
  uptimePct: z.number().min(0).max(100).nullable(),
  lastCycle: z.string().datetime().nullable(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export function disconnectedSnapshot(): Snapshot {
  return {
    timestamp: new Date().toISOString(),
    source: "Not connected",
    engine: "OFFLINE",
    health: [
      "Agent engine",
      "Alpaca",
      "Supabase event store",
      "Market data",
      "News feed",
      "AI provider",
      "Execution worker",
    ].map((name) => ({
      name,
      status: "UNKNOWN" as const,
      detail: "Awaiting verified engine telemetry",
    })),
    teams: desks.map((d) => ({
      id: d.id,
      status: "PAPER LEAGUE",
      mode: "PAPER",
      metrics: { ...emptyMetrics },
      pnl: null,
      openTrades: 0,
      risk: "UNKNOWN",
    })),
    events: [],
    markets: [],
    portfolio: {
      paperBalance: null,
      liveBalance: null,
      paperPnl: null,
      livePnl: null,
      openPositions: null,
    },
    killSwitch: {
      halted: false,
      reason: null,
      timestamp: null,
      triggeredBy: null,
    },
    regime: null,
    queueDepth: null,
    openOrders: null,
    latencyMs: null,
    uptimePct: null,
    lastCycle: null,
  };
}
