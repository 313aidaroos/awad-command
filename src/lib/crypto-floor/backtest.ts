/**
 * Backtester: replays a desk strategy hour by hour over closed Alpaca bars. Pure.
 * Same strategy code and same ledger as the live robot. Fills at the bar close ± slippage; no fees modeled.
 * Results are a research aid, not a promise — they ignore spread changes, partial fills and outages.
 */
import { buildBooks, emptyBook, markBook, tradeStats, type ClosedTrade } from "./ledger";
import { HOUR_MS } from "./market";
import { STRATEGIES } from "./strategies";
import type { Bar, OrderRow, StrategyId, StrategyParams } from "./types";

export type BacktestInput = {
  strategy: StrategyId;
  params: StrategyParams;
  bars: Map<string, Bar[]>;
  universe: string[];
  capital: number;
  slippageBps?: number;
};

export type BacktestResult = {
  strategy: StrategyId;
  params: StrategyParams;
  from: string | null;
  to: string | null;
  hours: number;
  capital: number;
  endEquity: number;
  returnPct: number;
  maxDrawdownPct: number;
  trades: number;
  winRate: number | null;
  expectancy: number | null;
  avgTradePct: number | null;
  profitFactor: number | null;
  openAtEnd: number;
  benchmark: Record<string, number | null>;
  recentTrades: ClosedTrade[];
};

export function runBacktest(input: BacktestInput): BacktestResult {
  const def = STRATEGIES[input.strategy];
  const slip = (input.slippageBps ?? 5) / 10_000;
  const book = "backtest";
  const times = Array.from(
    new Set(input.universe.flatMap((s) => (input.bars.get(s) ?? []).map((b) => Date.parse(b.timestamp)))),
  ).sort((a, b) => a - b);
  const idx = new Map(input.universe.map((s) => [s, -1]));
  const orders: OrderRow[] = [];
  let peak = input.capital;
  let maxDd = 0;
  let equity = input.capital;
  let seq = 0;
  const lastPrice = new Map<string, number>();

  for (const t of times) {
    const sliced = new Map<string, Bar[]>();
    for (const s of input.universe) {
      const arr = input.bars.get(s) ?? [];
      let i = idx.get(s)!;
      while (i + 1 < arr.length && Date.parse(arr[i + 1].timestamp) <= t) i++;
      idx.set(s, i);
      if (i >= 0) {
        sliced.set(s, arr.slice(0, i + 1));
        lastPrice.set(s, arr[i].close);
      }
    }
    const now = t + HOUR_MS; // decisions happen once the hour has closed
    const marked = markBook(buildBooks(orders).get(book) ?? emptyBook(book), input.capital, lastPrice);
    equity = marked.equity;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak > 0 ? ((peak - equity) / peak) * 100 : 0);
    if (Math.min(...input.universe.map((s) => sliced.get(s)?.length ?? 0)) < def.warmupBars) continue;

    const signals = def.run({
      params: input.params,
      universe: input.universe,
      bars: sliced,
      positions: marked.positions,
      recentEntries: orders.filter((o) => o.side === "buy" && o.intent === "entry").map((o) => ({ symbol: o.symbol, timestamp: o.created_at, strategy: input.strategy })),
      equity,
      now,
    });
    const done = new Set<string>();
    for (const sig of signals) {
      if (done.has(sig.symbol)) continue;
      const price = lastPrice.get(sig.symbol);
      if (!price) continue;
      const qty = sig.side === "sell" ? marked.positions.find((p) => p.symbol === sig.symbol)?.qty ?? 0 : Number(sig.qty ?? 0);
      if (!(qty > 0)) continue;
      const fill = price * (1 + (sig.side === "buy" ? slip : -slip));
      const iso = new Date(now).toISOString();
      seq++;
      orders.push({
        client_order_id: `bt${seq}`,
        created_at: iso,
        book,
        desk: null,
        strategy: input.strategy,
        mode: "shadow",
        symbol: sig.symbol,
        side: sig.side,
        intent: sig.type,
        qty,
        status: "filled",
        alpaca_order_id: null,
        filled_qty: qty,
        filled_avg_price: fill,
        filled_at: iso,
        reason: sig.reason,
      });
      done.add(sig.symbol);
    }
  }

  const final = markBook(buildBooks(orders).get(book) ?? emptyBook(book), input.capital, lastPrice);
  const stats = tradeStats(final.closedTrades);
  const benchmark: Record<string, number | null> = {};
  for (const s of input.universe) {
    const arr = input.bars.get(s) ?? [];
    benchmark[s] = arr.length > 1 ? ((arr[arr.length - 1].close - arr[0].close) / arr[0].close) * 100 : null;
  }
  return {
    strategy: input.strategy,
    params: input.params,
    from: times.length ? new Date(times[0]).toISOString() : null,
    to: times.length ? new Date(times[times.length - 1] + HOUR_MS).toISOString() : null,
    hours: times.length,
    capital: input.capital,
    endEquity: final.equity,
    returnPct: ((final.equity - input.capital) / input.capital) * 100,
    maxDrawdownPct: maxDd,
    trades: stats.trades,
    winRate: stats.winRate,
    expectancy: stats.expectancy,
    avgTradePct: stats.expectancyPct,
    profitFactor: stats.profitFactor,
    openAtEnd: final.positions.length,
    benchmark,
    recentTrades: final.closedTrades.slice(-12),
  };
}

/** Compact, chat-friendly summary line. */
export function backtestLine(r: BacktestResult): string {
  const p = (n: number | null) => (n === null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`);
  const days = Math.round(r.hours / 24);
  return `${r.strategy} over ${days}d: ${p(r.returnPct)} return, ${r.trades} trades, win ${r.winRate === null ? "—" : `${Math.round(r.winRate * 100)}%`}, avg trade ${p(r.avgTradePct)}, max drawdown ${r.maxDrawdownPct.toFixed(2)}%${r.openAtEnd ? `, ${r.openAtEnd} still open` : ""}. Buy-and-hold: ${Object.entries(r.benchmark).map(([s, v]) => `${s.split("/")[0]} ${p(v)}`).join(", ")}.`;
}
