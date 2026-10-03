/**
 * meanrev-v1 (NEON lane, 2026-10-02): mean reversion. PURE.
 * Buys when RSI(14) is oversold AND the close is below the lower Bollinger band (SMA20 − k·σ).
 * Exits at the mean (close ≥ SMA20), the target, the stop, or max hold.
 */
import type { Bar, Position, RecentEntry, Signal } from "../types";
import { heldHours, recentlyEntered, rsi, sma, stdev } from "./indicators";

export type MeanRevConfig = {
  universe: string[];
  rsiBelow: number;
  bandSigma: number;
  stopLossPct: number;
  takeProfitPct: number;
  maxHoldHours: number;
  positionSizePct: number;
  maxOpenPositions: number;
  minEntryIntervalHours: number;
};

export function runMeanRevStrategy(c: MeanRevConfig, bars: Map<string, Bar[]>, positions: Position[], recent: RecentEntry[], equity: number, now: number): { signals: Signal[] } {
  const signals: Signal[] = [];
  for (const p of positions) {
    const closes = (bars.get(p.symbol) ?? []).map((b) => b.close);
    const mean = sma(closes, 20);
    const reason =
      p.unrealizedPnlPct <= c.stopLossPct ? `Stop loss: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≤ ${c.stopLossPct}%`
      : p.unrealizedPnlPct >= c.takeProfitPct ? `Take profit: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≥ ${c.takeProfitPct}%`
      : mean !== null && closes.length && closes[closes.length - 1] >= mean && p.unrealizedPnlPct > 0 ? `Back to the mean (SMA20 ${mean.toFixed(4)})`
      : heldHours(p.enteredAt, now) >= c.maxHoldHours ? `Time exit: held ${heldHours(p.enteredAt, now).toFixed(0)}h ≥ ${c.maxHoldHours}h`
      : null;
    if (reason) signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason, pnlPct: p.unrealizedPnlPct });
  }
  let room = c.maxOpenPositions - positions.length;
  for (const symbol of c.universe) {
    if (room <= 0) break;
    if (positions.some((p) => p.symbol === symbol)) continue;
    if (recentlyEntered(symbol, recent, c.minEntryIntervalHours, now)) continue;
    const b = bars.get(symbol) ?? [];
    const closes = b.map((x) => x.close);
    const r = rsi(closes, 14);
    const m = sma(closes, 20);
    const sd = stdev(closes, 20);
    if (r === null || m === null || sd === null || !b.length) continue;
    const lower = m - c.bandSigma * sd;
    const last = b[b.length - 1];
    if (r < c.rsiBelow && last.close < lower) {
      signals.push({ type: "entry", symbol, side: "buy", reason: `Oversold: RSI ${r.toFixed(1)} < ${c.rsiBelow} and close below the lower band (${lower.toFixed(4)})`, qty: (equity * (c.positionSizePct / 100)) / last.close });
      room--;
    }
  }
  return { signals };
}
