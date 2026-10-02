/**
 * Shared Crypto Floor robot types. Pure data, no I/O.
 * Structurally compatible with the Bar / Position / Signal types exported by each strategy file.
 */

export type Bar = {
  symbol: string;
  timestamp: string; // bar open time, ISO
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Position = {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  enteredAt?: string;
  tranches?: number;
};

export type RecentEntry = {
  symbol: string;
  timestamp: string;
  strategy: string;
};

export type SignalType = "entry" | "exit" | "scale_in";

export type Signal = {
  type: SignalType;
  symbol: string;
  side: "buy" | "sell";
  reason: string;
  qty?: number;
  [extra: string]: unknown;
};

export type StrategyId = "momentum-v1" | "dip-v1" | "swing-v1" | "breakout-v1" | "custom-v1";

export type ParamValue = number | boolean;
export type StrategyParams = Record<string, ParamValue>;

export type DeskId = "samurai" | "neon" | "orbit" | "phantom" | "ronin";

export const DESK_IDS: DeskId[] = ["samurai", "neon", "orbit", "phantom", "ronin"];

/** Coins the four core desks trade. Hard list (ADD 5: AI can never widen it). RONIN's wider list is RONIN_UNIVERSE (strategy/custom-v1.ts). */
export const ROBOT_UNIVERSE = ["BTC/USD", "ETH/USD", "SOL/USD"] as const;

/** Per-desk risk overrides (crypto_floor_desks.risk). Set by migration/owner only, never by an agent. */
export type DeskRisk = {
  /** Desk day-loss pause, % of the desk's start-of-day equity (default: floor halt_day_loss_pct). */
  dayLossPct?: number;
};

export type OrderStatus =
  | "pending_submit"
  | "submitted"
  | "partially_filled"
  | "filled"
  | "canceled"
  | "rejected"
  | "unknown";

export type OrderRow = {
  client_order_id: string;
  created_at: string;
  updated_at?: string;
  book: string;
  desk: string | null;
  strategy: string | null;
  /** paper = Alpaca paper · shadow = simulated test fill · live = REAL MONEY on Coinbase */
  mode: "paper" | "shadow" | "live";
  venue?: "alpaca" | "coinbase" | "sim";
  venue_order_id?: string | null;
  fees?: number | null;
  symbol: string;
  side: "buy" | "sell";
  intent: "entry" | "scale_in" | "exit" | "manual" | null;
  qty: number;
  status: OrderStatus;
  alpaca_order_id: string | null;
  filled_qty: number;
  filled_avg_price: number | null;
  filled_at: string | null;
  reason: string | null;
  error?: string | null;
};

export type DeskRow = {
  id: DeskId;
  name: string;
  strategy: StrategyId;
  enabled: boolean;
  capital_usd: number;
  params: StrategyParams;
  version: number;
  paused_until: string | null;
  pause_reason: string | null;
  /** REAL MONEY switch (Coinbase). Off by default; only the owner can turn it on. */
  live_enabled?: boolean;
  live_enabled_at?: string | null;
  live_enabled_by?: string | null;
  /** custom-v1 desks (RONIN): the team's own strategy, written in the rule language. Validated before use. */
  spec?: unknown;
  risk?: DeskRisk | null;
  updated_at?: string;
};

export type ExperimentRow = {
  id: string;
  created_at: string;
  desk: DeskId;
  strategy: StrategyId;
  name: string;
  hypothesis: string | null;
  params: StrategyParams;
  /** custom-v1 tests: the candidate strategy (rule language). */
  spec?: unknown;
  capital_usd: number;
  status: "proposed" | "running" | "stopped" | "promoted" | "rejected";
  proposed_by: string | null;
  started_at: string | null;
  ends_at: string | null;
  ended_at: string | null;
  backtest: unknown;
  notes: string | null;
};

export type FloorParamsRow = {
  id: number;
  version: number;
  halted: boolean;
  halt_reason: string | null;
  halted_at: string | null;
  halted_by: string | null;
  halt_day_loss_pct: number;
  day_paused_until: string | null;
  day_pause_reason: string | null;
  max_open_positions_total: number;
  max_orders_per_tick: number;
  /** REAL MONEY hard limits (USD). Owner-only. */
  live_max_total_usd: number;
  live_max_trade_usd: number;
  live_day_loss_usd: number;
  live_paused_until: string | null;
  live_pause_reason: string | null;
  updated_at: string;
};

/** Per-symbol market read the scouts publish every tick (also the UI "Watching" line). */
export type WatchStat = {
  symbol: string;
  price: number | null;
  priceAt: string | null;
  ret1h: number | null;
  ret24h: number | null;
  high24h: number | null;
  distFromHighPct: number | null;
  lastHourGreen: boolean | null;
  lastClosedBarAt: string | null;
};
