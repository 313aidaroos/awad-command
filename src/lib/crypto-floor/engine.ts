/**
 * Crypto Floor robot — the tick planner. PURE: no I/O, fully unit-tested (engine.test.ts).
 *
 * Every 5 minutes the runner (tick.ts) gathers state and calls planTick(). The plan says which desks pause or
 * resume, which signals fire, which paper orders to send (and which are skipped, with a reason), and which
 * shadow fills experiments get. Priority: capital safety → execution correctness → strategy.
 *
 * Guardrails enforced here (never by an AI):
 * - Kill switch (params.halted): no orders of any kind, no shadow fills.
 * - Stale market data: no new entries in that coin (all coins if the data fetch failed); exits still run.
 * - Floor day loss ≤ halt_day_loss_pct of the floor's start-of-day equity: no new entries until next UTC day.
 * - Desk day loss ≤ halt_day_loss_pct of the desk's start-of-day equity: that desk pauses entries until next UTC day.
 * - Max open positions across all desks; max paper orders per tick (exits first); buying power for buys.
 * - One open order per book+symbol at a time (never stack orders while a previous one is unresolved).
 * - Sells only what the desk's own ledger holds AND the broker can deliver (shared account safety).
 * - 60 minute back-off after a rejected sell for the same desk+coin.
 */
import { buildBooks, emptyBook, markBook, type Book, type MarkedBook } from "./ledger";
import { nextUtcMidnight } from "./market";
import { STRATEGIES, effectiveParams } from "./strategies";
import type {
  Bar,
  DeskRow,
  ExperimentRow,
  FloorParamsRow,
  OrderRow,
  RecentEntry,
  Signal,
  StrategyId,
  StrategyParams,
} from "./types";

export const MIN_ORDER_USD = 5;
export const DUST_USD = 1;
export const SHADOW_SLIPPAGE_BPS = 5;
export const SELL_BACKOFF_MS = 60 * 60 * 1000;
export const OPEN_STATUSES = new Set(["pending_submit", "submitted", "partially_filled", "unknown"]);

export type PlanInput = {
  now: number;
  params: FloorParamsRow;
  desks: DeskRow[];
  experiments: ExperimentRow[];
  universe: string[];
  /** Closed hourly bars, oldest first. */
  bars: Map<string, Bar[]>;
  prices: Map<string, number>;
  /** Market data unusable for every coin (fetch failed): no new entries anywhere. */
  dataStale: boolean;
  dataStaleReason?: string | null;
  /** Coins whose data is stale: no new entries in those coins only. */
  staleSymbols?: Set<string>;
  /** All orders with fills (for the ledgers). */
  filledOrders: OrderRow[];
  /** Every order created in the last 72h, any status (recent entries, open orders, back-off). */
  recentOrders: OrderRow[];
  /** Today's start-of-day equity per book ('floor', desk ids, 'exp:<id>'). */
  baselines: Map<string, number>;
  /** Coin quantity the broker can deliver, by pair. */
  brokerQty: Map<string, number>;
  /** Non-marginable buying power (crypto). null = unknown → buys allowed (paper). */
  buyingPower: number | null;
};

export type PlannedOrder = {
  book: string;
  desk: string;
  strategy: StrategyId;
  mode: "paper" | "shadow";
  symbol: string;
  side: "buy" | "sell";
  intent: "entry" | "scale_in" | "exit";
  qty: number;
  refPrice: number;
  clientOrderId: string;
  reason: string;
  signal: Signal;
  experimentId?: string;
};

export type SignalOutcome = {
  book: string;
  desk: string;
  strategy: StrategyId;
  mode: "paper" | "shadow" | "live";
  signal: Signal;
  action: "order" | "skipped";
  skipReason?: string;
};

export type DeskPlan = {
  id: string;
  name: string;
  strategy: StrategyId;
  enabled: boolean;
  params: StrategyParams;
  marked: MarkedBook;
  startEquity: number;
  dayPnl: number;
  dayPnlPct: number;
  pausedUntil: string | null;
  pauseReason: string | null;
  entriesBlocked: string | null;
};

export type TickPlan = {
  halted: boolean;
  floor: {
    capital: number;
    equity: number;
    startEquity: number;
    dayPnl: number;
    dayPnlPct: number;
    pausedUntil: string | null;
    pauseReason: string | null;
    openPositions: number;
  };
  floorPause: { until: string; reason: string } | null;
  floorResume: boolean;
  desks: DeskPlan[];
  deskPauses: Array<{ desk: string; until: string; reason: string }>;
  deskResumes: string[];
  experiments: Array<{ id: string; marked: MarkedBook; params: StrategyParams }>;
  experimentsToStop: Array<{ id: string; reason: string }>;
  signals: SignalOutcome[];
  orders: PlannedOrder[];
  shadowFills: PlannedOrder[];
  baselinesToWrite: Array<{ book: string; equity: number }>;
};

export function stamp(now: number): string {
  const d = new Date(now);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
}

/** Idempotent per strategy+coin+side+minute (spec: cf-${strategy}-${symbol}-${side}-${YYYYMMDDHHmm}). */
export function clientOrderId(strategy: string, symbol: string, side: string, now: number): string {
  return `cf-${strategy}-${symbol.replace("/", "")}-${side}-${stamp(now)}`;
}

export function shadowOrderId(experimentId: string, symbol: string, side: string, now: number): string {
  return `sx-${experimentId.slice(0, 8)}-${symbol.replace("/", "")}-${side}-${stamp(now)}`;
}

export function recentEntriesFor(book: string, orders: OrderRow[], strategy: string): RecentEntry[] {
  return orders
    .filter((o) => o.book === book && o.side === "buy" && o.intent === "entry" && o.status !== "rejected")
    .map((o) => ({ symbol: o.symbol, timestamp: o.created_at, strategy }));
}

const sortExitsFirst = (a: SignalOutcome, b: SignalOutcome) =>
  (a.signal.side === "sell" ? 0 : 1) - (b.signal.side === "sell" ? 0 : 1);

export function planTick(input: PlanInput): TickPlan {
  const { now, params } = input;
  const halted = params.halted === true;
  const books: Map<string, Book> = buildBooks(input.filledOrders, DUST_USD);
  const baselinesToWrite: TickPlan["baselinesToWrite"] = [];
  const baseline = (book: string, equity: number) => {
    const existing = input.baselines.get(book);
    if (existing !== undefined && Number.isFinite(existing) && existing > 0) return existing;
    baselinesToWrite.push({ book, equity });
    return equity;
  };
  const midnight = nextUtcMidnight(now).toISOString();
  const lossLimit = Number(params.halt_day_loss_pct ?? -2);

  // ---- desks: mark to market, day P&L, pauses
  const deskPlans: DeskPlan[] = [];
  const deskPauses: TickPlan["deskPauses"] = [];
  const deskResumes: string[] = [];
  for (const desk of input.desks) {
    const strategy = desk.strategy;
    const marked = markBook(books.get(desk.id) ?? emptyBook(desk.id), Number(desk.capital_usd), input.prices);
    const startEquity = baseline(desk.id, marked.equity);
    const dayPnl = marked.equity - startEquity;
    const dayPnlPct = startEquity > 0 ? (dayPnl / startEquity) * 100 : 0;
    let pausedUntil = desk.paused_until;
    let pauseReason = desk.pause_reason;
    if (pausedUntil && Date.parse(pausedUntil) <= now) {
      deskResumes.push(desk.id);
      pausedUntil = null;
      pauseReason = null;
    }
    if (!pausedUntil && dayPnlPct <= lossLimit) {
      pausedUntil = midnight;
      pauseReason = `Desk day P&L ${dayPnlPct.toFixed(2)}% ≤ ${lossLimit}% — new entries paused until next UTC day`;
      deskPauses.push({ desk: desk.id, until: pausedUntil, reason: pauseReason });
    }
    deskPlans.push({
      id: desk.id,
      name: desk.name,
      strategy,
      enabled: desk.enabled,
      params: effectiveParams(strategy, desk.params),
      marked,
      startEquity,
      dayPnl,
      dayPnlPct,
      pausedUntil,
      pauseReason,
      entriesBlocked: null,
    });
  }

  // ---- floor
  const capital = deskPlans.reduce((s, d) => s + d.marked.capital, 0);
  const equity = deskPlans.reduce((s, d) => s + d.marked.equity, 0);
  const floorStart = baseline("floor", equity);
  const floorDayPnl = equity - floorStart;
  const floorDayPnlPct = floorStart > 0 ? (floorDayPnl / floorStart) * 100 : 0;
  let floorPausedUntil = params.day_paused_until;
  let floorPauseReason = params.day_pause_reason;
  let floorResume = false;
  let floorPause: TickPlan["floorPause"] = null;
  if (floorPausedUntil && Date.parse(floorPausedUntil) <= now) {
    floorResume = true;
    floorPausedUntil = null;
    floorPauseReason = null;
  }
  if (!floorPausedUntil && floorDayPnlPct <= lossLimit) {
    floorPausedUntil = midnight;
    floorPauseReason = `Floor day P&L ${floorDayPnlPct.toFixed(2)}% ≤ ${lossLimit}% — all new entries paused until next UTC day`;
    floorPause = { until: floorPausedUntil, reason: floorPauseReason };
  }
  let openPositions = deskPlans.reduce((s, d) => s + d.marked.positions.length, 0);

  const openOrderKeys = new Set(
    input.recentOrders.filter((o) => OPEN_STATUSES.has(o.status)).map((o) => `${o.book}|${o.symbol}`),
  );
  const recentRejectedSells = new Set(
    input.recentOrders
      .filter((o) => o.side === "sell" && o.status === "rejected" && now - Date.parse(o.created_at) < SELL_BACKOFF_MS)
      .map((o) => `${o.book}|${o.symbol}`),
  );

  // ---- run strategies
  const outcomes: SignalOutcome[] = [];
  for (const d of deskPlans) {
    d.entriesBlocked = halted
      ? "Kill switch is on"
      : input.dataStale
        ? `Market data stale${input.dataStaleReason ? `: ${input.dataStaleReason}` : ""}`
        : floorPausedUntil
          ? floorPauseReason ?? "Floor day-loss pause"
          : d.pausedUntil
            ? d.pauseReason ?? "Desk day-loss pause"
            : !d.enabled
              ? "Desk switched off by owner"
              : null;
    const signals = STRATEGIES[d.strategy].run({
      params: d.params,
      universe: input.universe,
      bars: input.bars,
      positions: d.marked.positions,
      recentEntries: recentEntriesFor(d.id, input.recentOrders, d.strategy),
      equity: d.marked.equity,
      now,
    });
    for (const signal of signals) {
      outcomes.push({ book: d.id, desk: d.id, strategy: d.strategy, mode: "paper", signal, action: "order" });
    }
  }

  // ---- turn signals into paper orders (exits first)
  outcomes.sort(sortExitsFirst);
  const orders: PlannedOrder[] = [];
  const plannedSellQty = new Map<string, number>();
  let buyingPower = input.buyingPower;
  const maxOrders = Math.max(0, Number(params.max_orders_per_tick ?? 3));
  const maxOpen = Math.max(0, Number(params.max_open_positions_total ?? 8));
  for (const o of outcomes) {
    const d = deskPlans.find((x) => x.id === o.desk)!;
    const sig = o.signal;
    const key = `${o.book}|${sig.symbol}`;
    const price = input.prices.get(sig.symbol);
    const skip = (reason: string) => {
      o.action = "skipped";
      o.skipReason = reason;
    };
    if (halted) { skip("Kill switch is on — no orders"); continue; }
    if (!price) { skip("No current price"); continue; }
    if (sig.side === "buy" && d.entriesBlocked) { skip(d.entriesBlocked); continue; }
    if (sig.side === "buy" && input.staleSymbols?.has(sig.symbol)) { skip(`Market data stale for ${sig.symbol}`); continue; }
    if (openOrderKeys.has(key)) { skip("Previous order for this coin is still unresolved — waiting for reconcile"); continue; }
    if (orders.length >= maxOrders) { skip(`Max ${maxOrders} orders per tick reached`); continue; }

    let qty: number;
    if (sig.side === "sell") {
      if (recentRejectedSells.has(key)) { skip("Sell was rejected in the last 60 min — backing off"); continue; }
      const held = d.marked.positions.find((p) => p.symbol === sig.symbol)?.qty ?? 0;
      const brokerLeft = (input.brokerQty.get(sig.symbol) ?? 0) - (plannedSellQty.get(sig.symbol) ?? 0);
      qty = Math.min(held, brokerLeft);
      if (qty * price < DUST_USD) {
        skip(`Broker holds ${Math.max(0, brokerLeft)} ${sig.symbol} for this desk's ${held} — nothing to sell (shared account?)`);
        continue;
      }
      plannedSellQty.set(sig.symbol, (plannedSellQty.get(sig.symbol) ?? 0) + qty);
    } else {
      const isNewPosition = sig.type === "entry";
      if (isNewPosition && openPositions >= maxOpen) { skip(`Floor at max ${maxOpen} open positions`); continue; }
      qty = Number(sig.qty ?? 0);
      const notional = qty * price;
      if (!(notional >= MIN_ORDER_USD)) { skip(`Order size $${notional.toFixed(2)} below $${MIN_ORDER_USD} minimum`); continue; }
      if (buyingPower !== null && notional > buyingPower) { skip(`Needs $${notional.toFixed(2)}, buying power $${buyingPower.toFixed(2)}`); continue; }
      if (buyingPower !== null) buyingPower -= notional;
      if (isNewPosition) openPositions++;
    }
    orders.push({
      book: o.book,
      desk: o.desk,
      strategy: o.strategy,
      mode: "paper",
      symbol: sig.symbol,
      side: sig.side,
      intent: sig.type,
      qty,
      refPrice: price,
      clientOrderId: clientOrderId(o.strategy, sig.symbol, sig.side, now),
      reason: sig.reason,
      signal: sig,
    });
  }

  // ---- shadow experiments (simulated fills; never sent to a broker)
  const experiments: TickPlan["experiments"] = [];
  const experimentsToStop: TickPlan["experimentsToStop"] = [];
  const shadowFills: PlannedOrder[] = [];
  for (const exp of input.experiments.filter((e) => e.status === "running")) {
    if (exp.ends_at && Date.parse(exp.ends_at) <= now) {
      experimentsToStop.push({ id: exp.id, reason: "Test window ended" });
      continue;
    }
    const book = `exp:${exp.id}`;
    const p = effectiveParams(exp.strategy, exp.params);
    const marked = markBook(books.get(book) ?? emptyBook(book), Number(exp.capital_usd), input.prices);
    experiments.push({ id: exp.id, marked, params: p });
    if (halted) continue;
    const signals = STRATEGIES[exp.strategy].run({
      params: p,
      universe: input.universe,
      bars: input.bars,
      positions: marked.positions,
      recentEntries: recentEntriesFor(book, input.recentOrders, exp.strategy),
      equity: marked.equity,
      now,
    });
    for (const sig of signals) {
      const outcome: SignalOutcome = { book, desk: exp.desk, strategy: exp.strategy, mode: "shadow", signal: sig, action: "order" };
      outcomes.push(outcome);
      const price = input.prices.get(sig.symbol);
      if (!price) { outcome.action = "skipped"; outcome.skipReason = "No current price"; continue; }
      if (sig.side === "buy" && (input.dataStale || input.staleSymbols?.has(sig.symbol))) { outcome.action = "skipped"; outcome.skipReason = "Market data stale"; continue; }
      const qty = sig.side === "sell" ? marked.positions.find((x) => x.symbol === sig.symbol)?.qty ?? 0 : Number(sig.qty ?? 0);
      if (!(qty * price >= (sig.side === "sell" ? DUST_USD : MIN_ORDER_USD))) { outcome.action = "skipped"; outcome.skipReason = "Size too small"; continue; }
      const slip = (SHADOW_SLIPPAGE_BPS / 10_000) * (sig.side === "buy" ? 1 : -1);
      shadowFills.push({
        book,
        desk: exp.desk,
        strategy: exp.strategy,
        mode: "shadow",
        symbol: sig.symbol,
        side: sig.side,
        intent: sig.type,
        qty,
        refPrice: price * (1 + slip),
        clientOrderId: shadowOrderId(exp.id, sig.symbol, sig.side, now),
        reason: sig.reason,
        signal: sig,
        experimentId: exp.id,
      });
    }
  }

  return {
    halted,
    floor: {
      capital,
      equity,
      startEquity: floorStart,
      dayPnl: floorDayPnl,
      dayPnlPct: floorDayPnlPct,
      pausedUntil: floorPausedUntil,
      pauseReason: floorPauseReason,
      openPositions: deskPlans.reduce((s, d) => s + d.marked.positions.length, 0),
    },
    floorPause,
    floorResume,
    desks: deskPlans,
    deskPauses,
    deskResumes,
    experiments,
    experimentsToStop,
    signals: outcomes,
    orders,
    shadowFills,
    baselinesToWrite,
  };
}
