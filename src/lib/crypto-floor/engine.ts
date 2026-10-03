/**
 * Crypto Floor robot — the tick planner. PURE: no I/O, fully unit-tested (engine.test.ts).
 *
 * Every 5 minutes the runner (tick.ts) gathers state and calls planTick(). The plan says which desks pause or
 * resume, which signals fire, which paper orders to send (and which are skipped, with a reason), and which
 * shadow fills experiments get. Priority: capital safety → execution correctness → strategy.
 *
 * Guardrails enforced here (never by an AI):
 * - Kill switch (params.halted): no orders of any kind, no shadow fills.
 * - Stale market data: no new entries in that symbol (all symbols if the data fetch failed); exits still run.
 * - HARD desk daily loss cap (risk.ts, owner-only, all asset classes): a desk at its cap opens nothing new until the
 *   next UTC day; exits and stops keep running. 2026-10-02: this (plus the kill switch) is the ONLY automatic pause —
 *   the floor-wide day pause, quiet hours and day-pauses are gone. Crypto is planned 24/7.
 * - CYCLE straddles (2026-10-03): both legs or nothing; same strike + expiry, 21–35 DTE, whole debit ≤ $500 (risk.ts).
 * - Asset sessions (assets.ts): stocks regular (market/day) + extended (limit/day/extended_hours, whole shares);
 *   options regular hours only, long premium only, sized so premium × 100 × contracts ≤ the desk's options max loss.
 * - Broker reconcile (reconcile.ts): books only count floor orders (cf-/rc-); claims the broker can't back are cleared
 *   (no sell sent); foreign broker positions are never adopted, scored or sold.
 * - Max open positions across all desks; max paper orders per tick (exits first); buying power for buys.
 * - One open order per book+symbol at a time (never stack orders while a previous one is unresolved).
 * - Sells only what the desk's own ledger holds AND the broker can deliver (shared account safety).
 * - 60 minute back-off after a rejected sell for the same desk+coin.
 */
import { assetClass, daysToExpiry, extendedLimitPrice, marketSession, orderShape, type AssetClass, type Session } from "./assets";
import { deskAssets, deskLanes, type DeskAssets } from "./desks";
import { buildBooks, emptyBook, markBook, type Book, type MarkedBook } from "./ledger";
import { nextUtcMidnight } from "./market";
import { floorOwnedOrder, planReconcile, reconcileRow, type ReconcileAdjustment } from "./reconcile";
import { STRADDLE_MAX_DEBIT_USD, atLossCap, deskDailyLossCap, effectiveFloorLimits, optionMaxLossUsd, sizeLongOption, sizeStraddle } from "./risk";
import { CYCLE_SCREEN, OPTIONS_UNIVERSE, STRATEGIES, effectiveParams, resolveSpec, strategyUniverse } from "./strategies";
import { CYCLE_BASE_UNDERLYINGS, groupStraddles, scanCycles, type CycleScan } from "./strategy/cycle-straddle-v1";
import { RONIN_UNIVERSE, type CustomSpec } from "./strategy/custom-v1";
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
  /** Core desks' coins. custom-v1 desks/tests trade their spec's own coins (bars must include them). */
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
  /** LONG quantity the floor's own broker account can deliver, by floor symbol (pair / ticker / OCC). */
  brokerQty: Map<string, number>;
  /** false → broker holdings unknown this tick: no reconcile (never clear on missing data). Default true. */
  brokerKnown?: boolean;
  /** Non-marginable buying power. null = unknown → buys allowed (paper). */
  buyingPower: number | null;
  /** Stock tickers with data this tick (desks with stocks / the options lane's underlyings). */
  stockUniverse?: string[];
  /** Closed 15-minute bars (scalp-v1). */
  bars15m?: Map<string, Bar[]>;
  /** US equity session now (default: clock-based marketSession). Crypto ignores it (24/7). */
  session?: Session;
  /** Option chains by underlying (regular hours only), for options-v1 entries. */
  optionChains?: Map<string, OptionCandidate[]>;
  /** CYCLE: ~1 year of closed DAILY bars for SPY/QQQ + the cycle candidates (the cycle detector's input). */
  barsDaily?: Map<string, Bar[]>;
  /** CYCLE: option chains (21–35 DTE, near the money) for the week's straddle underlyings, Mondays in regular hours. */
  straddleChains?: Map<string, OptionCandidate[]>;
};

export type OptionCandidate = { symbol: string; right: "call" | "put"; strike: number; expiration: string; bid: number; ask: number };

/** Contract choice for a long option: 7–30 DTE, two-sided quote, spread ≤ 15% of ask, strike nearest the underlying. */
export const OPTION_DTE_MIN = 7;
export const OPTION_DTE_MAX = 30;
export const OPTION_MAX_SPREAD_PCT = 15;

export function pickOptionContract(chain: OptionCandidate[], right: "call" | "put", underlyingPrice: number, now: number): OptionCandidate | null {
  const ok = chain.filter((c) => {
    const dte = daysToExpiry(c.symbol, now);
    return c.right === right && dte !== null && dte >= OPTION_DTE_MIN && dte <= OPTION_DTE_MAX && c.ask > 0 && c.bid > 0 && ((c.ask - c.bid) / c.ask) * 100 <= OPTION_MAX_SPREAD_PCT;
  });
  if (!ok.length) return null;
  return ok.sort((a, b) => Math.abs(a.strike - underlyingPrice) - Math.abs(b.strike - underlyingPrice) || a.expiration.localeCompare(b.expiration))[0];
}

/** CYCLE straddle: both legs at one strike + expiry, 21–35 DTE (closest to 28), two-sided quotes, spread ≤ 15% each. */
export const STRADDLE_DTE_MIN = 21;
export const STRADDLE_DTE_MAX = 35;
export const STRADDLE_DTE_TARGET = 28;

export function pickStraddle(chain: OptionCandidate[], underlyingPrice: number, now: number): { call: OptionCandidate; put: OptionCandidate } | null {
  const liquid = (c: OptionCandidate) => {
    const dte = daysToExpiry(c.symbol, now);
    return dte !== null && dte >= STRADDLE_DTE_MIN && dte <= STRADDLE_DTE_MAX && c.ask > 0 && c.bid > 0 && ((c.ask - c.bid) / c.ask) * 100 <= OPTION_MAX_SPREAD_PCT;
  };
  const puts = new Map(chain.filter((c) => c.right === "put" && liquid(c)).map((c) => [`${c.expiration}|${c.strike}`, c]));
  const pairs = chain
    .filter((c) => c.right === "call" && liquid(c) && puts.has(`${c.expiration}|${c.strike}`))
    .map((call) => ({ call, put: puts.get(`${call.expiration}|${call.strike}`)! }));
  if (!pairs.length) return null;
  const dteOff = (c: OptionCandidate) => Math.abs((daysToExpiry(c.symbol, now) ?? 0) - STRADDLE_DTE_TARGET);
  return pairs.sort((a, b) => dteOff(a.call) - dteOff(b.call) || Math.abs(a.call.strike - underlyingPrice) - Math.abs(b.call.strike - underlyingPrice))[0];
}

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
  assetClass: AssetClass;
  orderType: "market" | "limit";
  timeInForce: "gtc" | "day";
  extendedHours: boolean;
  /** Limit price as quoted by the broker (per share; options per-share premium). */
  limitPrice?: number;
  /** Options: max loss of the position = limit × 100 × contracts (≤ the desk's cap). */
  maxLossUsd?: number;
  /** CYCLE: both legs of one straddle carry its total debit (≤ STRADDLE_MAX_DEBIT_USD). */
  straddleDebitUsd?: number;
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
  spec: CustomSpec | null;
  universe: string[];
  dayLossLimitPct: number;
  /** Hard loss cap in USD today (negative) = start-of-day equity × cap %. */
  lossCapUsd: number;
  /** How much more the desk can lose today before the cap (≥ 0). */
  lossCapRemainingUsd: number;
  atLossCap: boolean;
  optionMaxLossUsd: number;
  assets: DeskAssets;
  lanes: StrategyId[];
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
  experiments: Array<{ id: string; marked: MarkedBook; params: StrategyParams; spec: CustomSpec | null }>;
  experimentsToStop: Array<{ id: string; reason: string }>;
  signals: SignalOutcome[];
  orders: PlannedOrder[];
  shadowFills: PlannedOrder[];
  baselinesToWrite: Array<{ book: string; equity: number }>;
  session: Session;
  limits: { maxOrdersPerTick: number; maxOpenPositions: number };
  /** Ghost/short claims cleared this tick (no broker order) and the ledger rows that record them. */
  reconcile: ReconcileAdjustment[];
  reconcileRows: OrderRow[];
  /** CYCLE's weekly cycle screen (null when no desk runs cycle-straddle-v1). */
  cycleScan: CycleScan | null;
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

/** Entries of `strategy` in `book` (legacy rows without a strategy belong to the desk's primary). */
export function recentEntriesFor(book: string, orders: OrderRow[], strategy: string, primary: string = strategy): RecentEntry[] {
  return orders
    .filter((o) => o.book === book && o.side === "buy" && o.intent === "entry" && o.status !== "rejected" && (o.strategy ?? primary) === strategy)
    .map((o) => ({ symbol: o.symbol, timestamp: o.created_at, strategy }));
}

/** A desk's HARD daily loss cap (%). Owner-set risk.dayLossPct inside risk.ts bounds, else the default. */
export function deskDayLossLimit(desk: Pick<DeskRow, "risk">): number {
  return deskDailyLossCap(desk);
}

/** Symbols a lane evaluates for ENTRIES this tick (held positions are always evaluated for exits). */
export function laneUniverse(opts: { desk: string; strategy: StrategyId; spec: CustomSpec | null; coreCrypto: string[]; stocks: string[]; bars: Map<string, Bar[]>; session: Session; cycleUnderlyings?: string[] }): string[] {
  const { strategy, coreCrypto, session } = opts;
  const assets = deskAssets(opts.desk);
  const stocks = assets.stocks && session !== "closed" ? opts.stocks : [];
  const uniq = (xs: string[]) => [...new Set(xs)];
  switch (strategy) {
    case "custom-v1":
      return strategyUniverse(strategy, opts.spec);
    case "options-v1":
      return session === "regular" ? OPTIONS_UNIVERSE.filter((u) => opts.bars.has(u)) : [];
    case "cycle-straddle-v1":
      return session === "regular" ? (opts.cycleUnderlyings ?? [...CYCLE_BASE_UNDERLYINGS]).filter((u) => opts.bars.has(u)) : [];
    case "scalp-v1":
    case "swing-v1":
      return coreCrypto;
    case "trend-v1":
      return uniq([...coreCrypto, ...RONIN_UNIVERSE.filter((s) => opts.bars.has(s)), ...stocks]);
    default:
      return uniq([...coreCrypto, ...stocks]);
  }
}

/** Coins + spec a desk or test trades. */
export function deskTrading(strategy: StrategyId, storedSpec: unknown, coreUniverse: string[]) {
  const spec = resolveSpec(strategy, storedSpec);
  return { spec, universe: strategy === "custom-v1" ? strategyUniverse(strategy, spec) : strategy === "cycle-straddle-v1" ? CYCLE_SCREEN : coreUniverse };
}

const sortExitsFirst = (a: SignalOutcome, b: SignalOutcome) =>
  (a.signal.side === "sell" ? 0 : 1) - (b.signal.side === "sell" ? 0 : 1);

export function planTick(input: PlanInput): TickPlan {
  const { now, params } = input;
  const halted = params.halted === true;
  const session: Session = input.session ?? marketSession(now);
  // Only floor-owned orders build the paper books (cf-… robot/manual orders, rc-… reconcile rows).
  const owned = input.filledOrders.filter(floorOwnedOrder);
  let books: Map<string, Book> = buildBooks(owned, DUST_USD);
  // Broker reconcile: reduce claims the floor's own account can't back. Never adopts, never sells.
  const reconcile = input.brokerKnown === false
    ? []
    : planReconcile({ now, books, brokerQty: input.brokerQty, prices: input.prices, recentOrders: input.recentOrders, openStatuses: OPEN_STATUSES });
  const reconcileRows = reconcile.map((a) => reconcileRow(a, now));
  if (reconcileRows.length) books = buildBooks([...owned, ...reconcileRows], DUST_USD);
  const baselinesToWrite: TickPlan["baselinesToWrite"] = [];
  const baseline = (book: string, equity: number) => {
    const existing = input.baselines.get(book);
    if (existing !== undefined && Number.isFinite(existing) && existing > 0) return existing;
    baselinesToWrite.push({ book, equity });
    return equity;
  };
  const midnight = nextUtcMidnight(now).toISOString();

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
    const deskLimit = deskDayLossLimit(desk);
    const capHit = atLossCap(dayPnlPct, deskLimit);
    let pausedUntil = desk.paused_until;
    let pauseReason = desk.pause_reason;
    if (pausedUntil && Date.parse(pausedUntil) <= now) {
      deskResumes.push(desk.id);
      pausedUntil = null;
      pauseReason = null;
    }
    if (!pausedUntil && capHit) {
      pausedUntil = midnight;
      pauseReason = `Daily loss cap hit: desk day P&L ${dayPnlPct.toFixed(2)}% ≤ ${deskLimit}% — no new positions until next UTC day (exits keep running)`;
      deskPauses.push({ desk: desk.id, until: pausedUntil, reason: pauseReason });
    }
    const lossCapUsd = (startEquity * deskLimit) / 100;
    deskPlans.push({
      id: desk.id,
      name: desk.name,
      strategy,
      enabled: desk.enabled,
      params: effectiveParams(strategy, desk.params),
      ...deskTrading(strategy, desk.spec, input.universe),
      dayLossLimitPct: deskLimit,
      lossCapUsd,
      lossCapRemainingUsd: Math.max(0, dayPnl - lossCapUsd),
      atLossCap: capHit,
      optionMaxLossUsd: optionMaxLossUsd(desk),
      assets: deskAssets(desk.id),
      lanes: deskLanes(desk.id, strategy),
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
  // Floor start = sum of the desks' own start-of-day equity, so adding a desk mid-day is not counted as P&L.
  const floorStart = deskPlans.reduce((s, d) => s + d.startEquity, 0);
  baseline("floor", floorStart);
  const floorDayPnl = equity - floorStart;
  const floorDayPnlPct = floorStart > 0 ? (floorDayPnl / floorStart) * 100 : 0;
  // 2026-10-02: no floor-wide day pause any more (the per-desk hard caps bound the floor). A leftover one is cleared.
  const floorPausedUntil: string | null = null;
  const floorPauseReason: string | null = null;
  const floorResume = Boolean(params.day_paused_until);
  const floorPause: TickPlan["floorPause"] = null;
  let openPositions = deskPlans.reduce((s, d) => s + d.marked.positions.length, 0);

  const openOrderKeys = new Set(
    input.recentOrders.filter((o) => OPEN_STATUSES.has(o.status)).map((o) => `${o.book}|${o.symbol}`),
  );
  const recentRejectedSells = new Set(
    input.recentOrders
      .filter((o) => o.side === "sell" && o.status === "rejected" && now - Date.parse(o.created_at) < SELL_BACKOFF_MS)
      .map((o) => `${o.book}|${o.symbol}`),
  );

  // ---- CYCLE's weekly screen: SPY/QQQ + stocks with a real ~15-trading-day cycle on 1y of daily bars.
  const cycleScan = deskPlans.some((d) => d.lanes.includes("cycle-straddle-v1")) ? scanCycles(input.barsDaily ?? new Map()) : null;

  // ---- run strategies
  const outcomes: SignalOutcome[] = [];
  for (const d of deskPlans) {
    d.entriesBlocked = halted
      ? "Kill switch is on"
      : input.dataStale
        ? `Market data stale${input.dataStaleReason ? `: ${input.dataStaleReason}` : ""}`
        : floorPausedUntil
          ? floorPauseReason ?? "Floor pause"
          : d.atLossCap
            ? `Daily loss cap hit (${d.dayPnlPct.toFixed(2)}% ≤ ${d.dayLossLimitPct}%) — no new positions until next UTC day`
            : d.pausedUntil
              ? d.pauseReason ?? "Desk daily loss cap"
              : !d.enabled
                ? "Desk switched off by owner"
                : null;
    const owner = (p: { strategy?: string | null }) => p.strategy ?? d.strategy;
    for (const lane of d.lanes) {
      const primary = lane === d.strategy;
      const signals = STRATEGIES[lane].run({
        params: primary ? d.params : effectiveParams(lane, undefined),
        spec: primary ? d.spec : null,
        universe: primary && lane === "custom-v1" ? d.universe : laneUniverse({ desk: d.id, strategy: lane, spec: d.spec, coreCrypto: input.universe, stocks: input.stockUniverse ?? [], bars: input.bars, session, cycleUnderlyings: cycleScan?.underlyings }),
        bars: input.bars,
        bars15m: input.bars15m,
        positions: d.marked.positions.filter((p) => owner(p) === lane),
        recentEntries: recentEntriesFor(d.id, input.recentOrders, lane, d.strategy),
        equity: d.marked.equity,
        now,
      });
      for (const signal of signals) {
        const o: SignalOutcome = { book: d.id, desk: d.id, strategy: lane, mode: "paper", signal, action: "order" };
        const heldBy = d.marked.positions.find((p) => p.symbol === signal.symbol && owner(p) !== lane);
        if (signal.side === "buy" && heldBy) {
          o.action = "skipped";
          o.skipReason = `Held by this desk's ${owner(heldBy)} lane`;
        }
        outcomes.push(o);
      }
    }
  }

  // ---- turn signals into paper orders (exits first)
  outcomes.sort(sortExitsFirst);
  const orders: PlannedOrder[] = [];
  const plannedSellQty = new Map<string, number>();
  let buyingPower = input.buyingPower;
  const limits = effectiveFloorLimits(params);
  const maxOrders = limits.maxOrdersPerTick;
  const maxOpen = limits.maxOpenPositions;
  /** CYCLE: open straddles per desk (held + planned this tick). */
  const straddlesOpen = new Map<string, number>();
  for (const o of outcomes) {
    if (o.action === "skipped") continue;
    const d = deskPlans.find((x) => x.id === o.desk)!;
    let sig = o.signal;
    const skip = (reason: string) => {
      o.action = "skipped";
      o.skipReason = reason;
    };
    if (halted) { skip("Kill switch is on — no orders"); continue; }
    if (sig.side === "buy" && d.entriesBlocked) { skip(d.entriesBlocked); continue; }

    // CYCLE straddle entry: a long call AND a long put, same strike + expiry, both legs or nothing. Long premium only;
    // the whole debit (call + put) × 100 × contracts ≤ STRADDLE_MAX_DEBIT_USD.
    if (sig.side === "buy" && sig.optionRight === "straddle") {
      if (!d.assets.options) { skip("This desk does not trade options"); continue; }
      if (session !== "regular") { skip("Options trade in regular hours only"); continue; }
      const under = input.prices.get(sig.symbol);
      if (!under) { skip(`No price for ${sig.symbol}`); continue; }
      if (input.staleSymbols?.has(sig.symbol)) { skip(`Market data stale for ${sig.symbol}`); continue; }
      const maxStraddles = Number(sig.maxOpenStraddles);
      if (!straddlesOpen.has(d.id)) straddlesOpen.set(d.id, groupStraddles(d.marked.positions.filter((p) => (p.strategy ?? d.strategy) === o.strategy), now).length);
      if (!(straddlesOpen.get(d.id)! < maxStraddles)) { skip(`Max ${maxStraddles} straddles open`); continue; }
      const pair = pickStraddle(input.straddleChains?.get(sig.symbol) ?? [], under, now);
      if (!pair) { skip(`No liquid ATM straddle on ${sig.symbol} (${STRADDLE_DTE_MIN}–${STRADDLE_DTE_MAX} DTE, same strike, spread ≤ ${OPTION_MAX_SPREAD_PCT}%)`); continue; }
      if (openOrderKeys.has(`${o.book}|${pair.call.symbol}`) || openOrderKeys.has(`${o.book}|${pair.put.symbol}`)) { skip("Previous order for this straddle is still unresolved — waiting for reconcile"); continue; }
      if (orders.length + 2 > maxOrders) { skip(`Max ${maxOrders} orders per tick reached (a straddle needs 2)`); continue; }
      if (openPositions + 2 > maxOpen) { skip(`Floor at max ${maxOpen} open positions`); continue; }
      const sized = sizeStraddle(pair.call.ask, pair.put.ask, buyingPower ?? Number.POSITIVE_INFINITY);
      if (!sized.ok) { skip(sized.reason); continue; }
      if (sized.debitUsd > STRADDLE_MAX_DEBIT_USD + 1e-6) { skip("Straddle debit above the max"); continue; } // defensive
      if (buyingPower !== null) buyingPower -= sized.debitUsd;
      openPositions += 2;
      straddlesOpen.set(d.id, straddlesOpen.get(d.id)! + 1);
      const base = { underlying: sig.symbol, strike: pair.call.strike, expiration: pair.call.expiration, straddleDebitUsd: sized.debitUsd };
      o.signal = { ...sig, qty: sized.qty, ...base };
      for (const [leg, limit] of [[pair.call, sized.callLimit], [pair.put, sized.putLimit]] as const) {
        const legSig: Signal = { ...sig, symbol: leg.symbol, qty: sized.qty, optionRight: leg.right, ...base, maxLossUsd: limit * 100 * sized.qty };
        orders.push({
          book: o.book,
          desk: o.desk,
          strategy: o.strategy,
          mode: "paper",
          symbol: leg.symbol,
          side: "buy",
          intent: "entry",
          qty: sized.qty,
          refPrice: limit * 100,
          clientOrderId: clientOrderId(o.strategy, leg.symbol, "buy", now),
          reason: `${sig.reason} — ${leg.right} leg ${leg.strike} ${leg.expiration}, straddle debit $${sized.debitUsd.toFixed(2)}`,
          signal: legSig,
          assetClass: "option",
          orderType: "limit",
          timeInForce: "day",
          extendedHours: false,
          limitPrice: limit,
          maxLossUsd: limit * 100 * sized.qty,
          straddleDebitUsd: sized.debitUsd,
        });
      }
      continue;
    }

    // Options entry: a long call/put on the signal's underlying. Long premium only; sized to the max-loss cap.
    let optionMaxLoss: number | undefined;
    let optionLimit: number | undefined;
    const right = sig.optionRight === "call" || sig.optionRight === "put" ? sig.optionRight : null;
    if (sig.side === "buy" && right) {
      if (!d.assets.options) { skip("This desk does not trade options"); continue; }
      if (session !== "regular") { skip("Options trade in regular hours only"); continue; }
      const under = input.prices.get(sig.symbol);
      if (!under) { skip(`No price for ${sig.symbol}`); continue; }
      const contract = pickOptionContract(input.optionChains?.get(sig.symbol) ?? [], right, under, now);
      if (!contract) { skip(`No liquid ${right} on ${sig.symbol} (${OPTION_DTE_MIN}–${OPTION_DTE_MAX} DTE, spread ≤ ${OPTION_MAX_SPREAD_PCT}%)`); continue; }
      const sized = sizeLongOption(contract.ask, d.optionMaxLossUsd, buyingPower ?? Number.POSITIVE_INFINITY);
      if (!sized.ok) { skip(sized.reason); continue; }
      optionMaxLoss = sized.maxLossUsd;
      optionLimit = sized.limitPrice;
      sig = { ...sig, symbol: contract.symbol, qty: sized.qty, underlying: o.signal.symbol, strike: contract.strike, expiration: contract.expiration, maxLossUsd: sized.maxLossUsd };
      o.signal = sig;
    }

    const asset = assetClass(sig.symbol);
    if (asset === "stock" && !d.assets.stocks && !d.marked.positions.some((p) => p.symbol === sig.symbol)) { skip("This desk does not trade stocks"); continue; }
    if (asset === "option" && sig.side === "buy" && optionLimit === undefined) { skip("Option buys must come from the options sizing path"); continue; }
    const allowed = orderShape(asset, session);
    if (!allowed.ok) { skip(allowed.reason); continue; }
    const shape = allowed.shape;
    const key = `${o.book}|${sig.symbol}`;
    const price = asset === "option" && optionLimit !== undefined ? optionLimit * 100 : input.prices.get(sig.symbol);
    if (!price) { skip("No current price"); continue; }
    if (sig.side === "buy" && input.staleSymbols?.has(asset === "option" ? String(sig.underlying) : sig.symbol)) { skip(`Market data stale for ${sig.symbol}`); continue; }
    if (openOrderKeys.has(key)) { skip("Previous order for this symbol is still unresolved — waiting for reconcile"); continue; }
    if (orders.length >= maxOrders) { skip(`Max ${maxOrders} orders per tick reached`); continue; }

    let qty: number;
    if (sig.side === "sell") {
      if (recentRejectedSells.has(key)) { skip("Sell was rejected in the last 60 min — backing off"); continue; }
      // Only ever sell what THIS desk's ledger holds long AND the floor's broker account holds long. For options this
      // makes every sell a closing sell of a long contract: a naked short option can't be planned.
      const held = Math.max(0, d.marked.positions.find((p) => p.symbol === sig.symbol)?.qty ?? 0);
      const brokerLeft = Math.max(0, (input.brokerQty.get(sig.symbol) ?? 0) - (plannedSellQty.get(sig.symbol) ?? 0));
      qty = Math.min(held, brokerLeft);
      if (shape.wholeUnits) qty = Math.floor(qty + 1e-9);
      if (!(qty > 0) || qty * price < DUST_USD) {
        skip(held > 0 && shape.wholeUnits && brokerLeft >= held
          ? `Fractional ${sig.symbol} can't be sold in this session — waits for regular hours`
          : `Broker holds ${brokerLeft} ${sig.symbol} for this desk's ${held} — nothing to sell`);
        continue;
      }
      plannedSellQty.set(sig.symbol, (plannedSellQty.get(sig.symbol) ?? 0) + qty);
    } else {
      const isNewPosition = sig.type === "entry";
      if (isNewPosition && openPositions >= maxOpen) { skip(`Floor at max ${maxOpen} open positions`); continue; }
      qty = Number(sig.qty ?? 0);
      if (shape.wholeUnits) qty = Math.floor(qty + 1e-9);
      const notional = qty * price;
      if (!(notional >= MIN_ORDER_USD)) { skip(`Order size $${notional.toFixed(2)} below $${MIN_ORDER_USD} minimum`); continue; }
      if (optionMaxLoss !== undefined && notional > d.optionMaxLossUsd + 1e-6) { skip("Option premium above the max loss per position"); continue; }
      if (buyingPower !== null && notional > buyingPower) { skip(`Needs $${notional.toFixed(2)}, buying power $${buyingPower.toFixed(2)}`); continue; }
      if (buyingPower !== null) buyingPower -= notional;
      if (isNewPosition) openPositions++;
    }
    const limitPrice = asset === "option"
      ? sig.side === "buy" ? optionLimit : undefined
      : shape.orderType === "limit" ? extendedLimitPrice(sig.side, price) : undefined;
    if (asset === "option" && sig.side === "sell") {
      // Closing sell of a long contract: market orders are allowed for options in regular hours.
      shape.orderType = "market";
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
      assetClass: asset,
      orderType: shape.orderType,
      timeInForce: shape.timeInForce,
      extendedHours: shape.extendedHours,
      ...(limitPrice !== undefined ? { limitPrice } : {}),
      ...(optionMaxLoss !== undefined ? { maxLossUsd: optionMaxLoss } : {}),
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
    const t = deskTrading(exp.strategy, exp.spec, input.universe);
    const marked = markBook(books.get(book) ?? emptyBook(book), Number(exp.capital_usd), input.prices);
    experiments.push({ id: exp.id, marked, params: p, spec: t.spec });
    if (halted) continue;
    const signals = STRATEGIES[exp.strategy].run({
      params: p,
      spec: t.spec,
      universe: exp.strategy === "custom-v1" ? t.universe : laneUniverse({ desk: exp.desk, strategy: exp.strategy, spec: t.spec, coreCrypto: input.universe, stocks: input.stockUniverse ?? [], bars: input.bars, session }),
      bars: input.bars,
      bars15m: input.bars15m,
      positions: marked.positions,
      recentEntries: recentEntriesFor(book, input.recentOrders, exp.strategy),
      equity: marked.equity,
      now,
    });
    for (const sig of signals) {
      const outcome: SignalOutcome = { book, desk: exp.desk, strategy: exp.strategy, mode: "shadow", signal: sig, action: "order" };
      outcomes.push(outcome);
      if (sig.optionRight) { outcome.action = "skipped"; outcome.skipReason = "Options are not simulated in shadow tests"; continue; }
      const shapeOk = orderShape(assetClass(sig.symbol), session);
      if (!shapeOk.ok) { outcome.action = "skipped"; outcome.skipReason = shapeOk.reason; continue; }
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
        assetClass: assetClass(sig.symbol),
        orderType: "market",
        timeInForce: "gtc",
        extendedHours: false,
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
    session,
    limits,
    reconcile,
    reconcileRows,
    cycleScan,
  };
}
