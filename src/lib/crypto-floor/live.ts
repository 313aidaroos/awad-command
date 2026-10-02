/**
 * REAL MONEY planner (Coinbase). PURE: no I/O, fully unit-tested (live.test.ts).
 *
 * A desk trades real money only when the OWNER has switched it on (crypto_floor_desks.live_enabled). It then runs
 * its own strategy on its own live ledger (book "live:<desk>"), sized by hard USD limits the owner sets:
 *   live_max_total_usd  — most real money in open positions across all live desks
 *   live_max_trade_usd  — most real money in any single buy
 *   live_day_loss_usd   — live P&L down this much since the start of the UTC day → no new live buys until midnight
 * Refused outright (no orders at all): kill switch on, Coinbase not connected/unreachable, key without Trade
 * permission, or key WITH Transfer permission (a trading robot never holds a key that can move money out).
 * A desk switched off keeps managing (selling) the live coins it already holds; it never buys.
 * AI never reaches this: agents have no tool that changes live switches or limits.
 */
import { OPEN_STATUSES, deskTrading, recentEntriesFor, stamp, type SignalOutcome } from "./engine";
import { buildBooks, emptyBook, markBook, type MarkedBook } from "./ledger";
import { nextUtcMidnight } from "./market";
import { floorToIncrement, toProductId, uuidFromSeed } from "./coinbase";
import { STRATEGIES, effectiveParams } from "./strategies";
import type { Bar, DeskRow, FloorParamsRow, OrderRow, Signal, StrategyId } from "./types";

export const LIVE_MAX_ORDERS_PER_TICK = 2;
export const LIVE_MIN_ORDER_USD = 2;
export const LIVE_SELL_BACKOFF_MS = 60 * 60 * 1000;
/** Keep a small USD cushion for fees so a buy is never rejected for "insufficient funds". */
export const LIVE_FEE_CUSHION = 0.985;

export type CoinbaseProductRule = { baseIncrement?: string; quoteIncrement?: string; quoteMin?: number; baseMin?: number; disabled?: boolean };

export type CoinbaseState = {
  configured: boolean;
  ok: boolean;
  error: string | null;
  canView: boolean;
  canTrade: boolean;
  canTransfer: boolean;
  usdAvailable: number;
  /** Coin quantity available on Coinbase by pair ("BTC/USD" → BTC available). */
  coins: Map<string, number>;
  /** Mid price by pair. */
  prices: Map<string, number>;
  products: Map<string, CoinbaseProductRule>;
};

export type LivePlanInput = {
  now: number;
  params: FloorParamsRow;
  desks: DeskRow[];
  universe: string[];
  bars: Map<string, Bar[]>;
  /** Fallback prices (Alpaca) when Coinbase has no quote. */
  prices: Map<string, number>;
  dataStale: boolean;
  staleSymbols?: Set<string>;
  filledOrders: OrderRow[];
  recentOrders: OrderRow[];
  baselines: Map<string, number>;
  coinbase: CoinbaseState;
};

export type LivePlannedOrder = {
  book: string;
  desk: string;
  strategy: StrategyId;
  symbol: string;
  productId: string;
  side: "buy" | "sell";
  intent: "entry" | "scale_in" | "exit";
  /** USD to spend (buys). */
  quoteSize?: string;
  /** Coin amount (sells). */
  baseSize?: string;
  estQty: number;
  refPrice: number;
  clientOrderId: string;
  seed: string;
  reason: string;
  signal: Signal;
};

export type LivePlan = {
  liveDesks: string[];
  enabledDesks: string[];
  blocked: string | null;
  exposureUsd: number;
  remainingUsd: number;
  pnlNow: number;
  dayPnl: number;
  pausedUntil: string | null;
  pause: { until: string; reason: string } | null;
  resume: boolean;
  books: Array<{ desk: string; marked: MarkedBook }>;
  signals: SignalOutcome[];
  orders: LivePlannedOrder[];
  baselinesToWrite: Array<{ book: string; equity: number }>;
};

export function liveBook(desk: string) {
  return `live:${desk}`;
}

export function coinbaseBlockReason(params: FloorParamsRow, cb: CoinbaseState): string | null {
  if (params.halted) return "Kill switch is on";
  if (!cb.configured) return "Coinbase is not connected (no API key)";
  if (!cb.ok) return `Coinbase unreachable: ${cb.error ?? "unknown error"}`;
  if (cb.canTransfer) return "Coinbase key can TRANSFER funds — refusing to trade. Create a key with View + Trade only";
  if (!cb.canTrade) return "Coinbase key has no Trade permission";
  return null;
}

export function planLive(input: LivePlanInput): LivePlan {
  const { now, params, coinbase: cb } = input;
  const liveOrders = input.filledOrders.filter((o) => o.mode === "live");
  const books = buildBooks(liveOrders);
  const prices = new Map(input.prices);
  for (const [pair, p] of cb.prices) prices.set(pair, p);

  const enabled = input.desks.filter((d) => d.live_enabled === true);
  const holding = input.desks.filter((d) => !d.live_enabled && (books.get(liveBook(d.id))?.positions.size ?? 0) > 0);
  const liveDesks = [...enabled, ...holding];

  const marked = input.desks.map((d) => ({ desk: d, marked: markBook(books.get(liveBook(d.id)) ?? emptyBook(liveBook(d.id)), 0, prices) }));
  const pnlNow = marked.reduce((s, m) => s + m.marked.realizedPnl + m.marked.unrealizedPnl, 0);
  const baselinesToWrite: LivePlan["baselinesToWrite"] = [];
  let start = input.baselines.get("live");
  if (start === undefined || !Number.isFinite(start)) {
    start = pnlNow;
    baselinesToWrite.push({ book: "live", equity: pnlNow });
  }
  const dayPnl = pnlNow - start;
  const exposureUsd = marked.reduce((s, m) => s + m.marked.positions.reduce((a, p) => a + p.qty * p.avgEntryPrice, 0), 0);

  let pausedUntil = params.live_paused_until;
  let resume = false;
  let pause: LivePlan["pause"] = null;
  if (pausedUntil && Date.parse(pausedUntil) <= now) {
    resume = true;
    pausedUntil = null;
  }
  if (!pausedUntil && params.live_day_loss_usd > 0 && dayPnl <= -params.live_day_loss_usd) {
    pausedUntil = nextUtcMidnight(now).toISOString();
    pause = { until: pausedUntil, reason: `Real-money day P&L −$${Math.abs(dayPnl).toFixed(2)} hit the −$${params.live_day_loss_usd} limit — no new real-money buys until next UTC day` };
  }

  const blocked = coinbaseBlockReason(params, cb);
  const base: Omit<LivePlan, "signals" | "orders"> = {
    liveDesks: liveDesks.map((d) => d.id),
    enabledDesks: enabled.map((d) => d.id),
    blocked,
    exposureUsd,
    remainingUsd: Math.max(0, params.live_max_total_usd - exposureUsd),
    pnlNow,
    dayPnl,
    pausedUntil,
    pause,
    resume,
    books: marked.filter((m) => liveDesks.some((d) => d.id === m.desk.id)).map((m) => ({ desk: m.desk.id, marked: m.marked })),
    baselinesToWrite,
  };
  if (!liveDesks.length) return { ...base, signals: [], orders: [] };

  const outcomes: SignalOutcome[] = [];
  const entryBlock = new Map<string, string | null>();
  for (const d of liveDesks) {
    const m = marked.find((x) => x.desk.id === d.id)!.marked;
    entryBlock.set(
      d.id,
      blocked ??
        (pausedUntil
          ? "Real-money day-loss pause"
          : !d.live_enabled
            ? "Real money switched off for this desk — sells only"
            : !d.enabled
              ? "Desk switched off"
              : d.paused_until && Date.parse(d.paused_until) > now
                ? "Desk day-loss pause"
                : input.dataStale
                  ? "Market data stale"
                  : null),
    );
    const t = deskTrading(d.strategy, d.spec, input.universe);
    const signals = STRATEGIES[d.strategy].run({
      params: effectiveParams(d.strategy, d.params),
      spec: t.spec,
      universe: t.universe,
      bars: input.bars,
      positions: m.positions,
      recentEntries: recentEntriesFor(liveBook(d.id), input.recentOrders, d.strategy),
      equity: d.capital_usd,
      now,
    });
    for (const signal of signals) outcomes.push({ book: liveBook(d.id), desk: d.id, strategy: d.strategy, mode: "live", signal, action: "order" });
  }
  outcomes.sort((a, b) => (a.signal.side === "sell" ? 0 : 1) - (b.signal.side === "sell" ? 0 : 1));

  const openKeys = new Set(input.recentOrders.filter((o) => o.mode === "live" && OPEN_STATUSES.has(o.status)).map((o) => `${o.book}|${o.symbol}`));
  // Back off an hour after Coinbase rejects an order for the same desk + coin + side (no retry storms).
  const rejectedRecently = new Set(
    input.recentOrders
      .filter((o) => o.mode === "live" && o.status === "rejected" && now - Date.parse(o.created_at) < LIVE_SELL_BACKOFF_MS)
      .map((o) => `${o.book}|${o.symbol}|${o.side}`),
  );
  const orders: LivePlannedOrder[] = [];
  const plannedSell = new Map<string, number>();
  let plannedBuyUsd = 0;
  for (const o of outcomes) {
    const sig = o.signal;
    const key = `${o.book}|${sig.symbol}`;
    const price = prices.get(sig.symbol);
    const rule = cb.products.get(sig.symbol) ?? {};
    const skip = (reason: string) => {
      o.action = "skipped";
      o.skipReason = reason;
    };
    if (blocked) { skip(blocked); continue; }
    if (!price) { skip("No Coinbase price"); continue; }
    if (rule.disabled) { skip(`${toProductId(sig.symbol)} trading is disabled on Coinbase`); continue; }
    if (openKeys.has(key)) { skip("Previous real-money order for this coin is still unresolved"); continue; }
    if (orders.length >= LIVE_MAX_ORDERS_PER_TICK) { skip(`Max ${LIVE_MAX_ORDERS_PER_TICK} real-money orders per tick`); continue; }
    const seed = `cf-live-${o.strategy}-${sig.symbol.replace("/", "")}-${sig.side}-${stamp(now)}`;

    if (rejectedRecently.has(`${key}|${sig.side}`)) { skip(`Real-money ${sig.side} rejected in the last hour — backing off`); continue; }
    if (sig.side === "sell") {
      const book = books.get(o.book);
      const held = book?.positions.get(sig.symbol)?.qty ?? 0;
      const avail = (cb.coins.get(sig.symbol) ?? 0) - (plannedSell.get(sig.symbol) ?? 0);
      const baseSize = floorToIncrement(Math.min(held, avail), rule.baseIncrement);
      const qty = Number(baseSize);
      if (!(qty * price >= LIVE_MIN_ORDER_USD) || (rule.baseMin && qty < rule.baseMin)) {
        skip(`Coinbase holds ${Math.max(0, avail)} ${sig.symbol.split("/")[0]} for this desk's ${held} — nothing to sell`);
        continue;
      }
      plannedSell.set(sig.symbol, (plannedSell.get(sig.symbol) ?? 0) + qty);
      orders.push({ book: o.book, desk: o.desk, strategy: o.strategy, symbol: sig.symbol, productId: toProductId(sig.symbol), side: "sell", intent: "exit", baseSize, estQty: qty, refPrice: price, clientOrderId: uuidFromSeed(seed), seed, reason: sig.reason, signal: sig });
      continue;
    }

    const block = entryBlock.get(o.desk);
    if (block) { skip(block); continue; }
    if (input.staleSymbols?.has(sig.symbol)) { skip(`Market data stale for ${sig.symbol}`); continue; }
    const strategyUsd = Number(sig.qty ?? 0) * price;
    const capRoom = params.live_max_total_usd - exposureUsd - plannedBuyUsd;
    const cashRoom = cb.usdAvailable * LIVE_FEE_CUSHION - plannedBuyUsd;
    const usd = Math.min(strategyUsd, params.live_max_trade_usd, capRoom, cashRoom);
    const minUsd = Math.max(LIVE_MIN_ORDER_USD, rule.quoteMin ?? 0);
    if (!(usd >= minUsd)) {
      skip(
        capRoom < minUsd
          ? `Real-money cap reached ($${exposureUsd.toFixed(2)} of $${params.live_max_total_usd} in positions)`
          : cashRoom < minUsd
            ? `Not enough USD on Coinbase ($${cb.usdAvailable.toFixed(2)} available)`
            : `Order $${usd.toFixed(2)} below $${minUsd} minimum`,
      );
      continue;
    }
    const quoteSize = floorToIncrement(usd, rule.quoteIncrement ?? "0.01");
    plannedBuyUsd += Number(quoteSize);
    orders.push({ book: o.book, desk: o.desk, strategy: o.strategy, symbol: sig.symbol, productId: toProductId(sig.symbol), side: "buy", intent: sig.type === "scale_in" ? "scale_in" : "entry", quoteSize, estQty: Number(quoteSize) / price, refPrice: price, clientOrderId: uuidFromSeed(seed), seed, reason: sig.reason, signal: sig });
  }

  return { ...base, signals: outcomes, orders };
}

/** Effective fill price with fees folded in: buys cost more, sells net less. */
export function effectiveFillPrice(side: "buy" | "sell", filledSize: number, avgPrice: number, filledValue: number | null, fees: number): number | null {
  if (!(filledSize > 0)) return null;
  const value = filledValue && filledValue > 0 ? filledValue : filledSize * avgPrice;
  return side === "buy" ? (value + fees) / filledSize : (value - fees) / filledSize;
}
