/**
 * trend-v1 (SAMURAI lane, 2026-10-02): momentum on NEW or TRENDING coins/tickers. PURE.
 * Ranks the wide universe (Awad's coins, RONIN's list, BTC/ETH, and stocks when the desk trades them) by 24h return;
 * buys the top `topN` that are up ≥ minRet24hPct in 24h, green in the last hour, on rising volume.
 * Exits: stop, target, or max hold.
 */
import type { Bar, Position, RecentEntry, Signal } from "../types";
import { heldHours, pctReturn, recentlyEntered, volumeRatio } from "./indicators";

export type TrendConfig = {
  universe: string[];
  topN: number;
  minRet24hPct: number;
  minVolumeRatio: number;
  stopLossPct: number;
  takeProfitPct: number;
  maxHoldHours: number;
  positionSizePct: number;
  maxOpenPositions: number;
  minEntryIntervalHours: number;
};

export function runTrendStrategy(c: TrendConfig, bars: Map<string, Bar[]>, positions: Position[], recent: RecentEntry[], equity: number, now: number): { signals: Signal[] } {
  const signals: Signal[] = [];
  for (const p of positions) {
    const reason =
      p.unrealizedPnlPct <= c.stopLossPct ? `Stop loss: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≤ ${c.stopLossPct}%`
      : p.unrealizedPnlPct >= c.takeProfitPct ? `Take profit: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≥ ${c.takeProfitPct}%`
      : heldHours(p.enteredAt, now) >= c.maxHoldHours ? `Time exit: held ${heldHours(p.enteredAt, now).toFixed(0)}h ≥ ${c.maxHoldHours}h`
      : null;
    if (reason) signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason, pnlPct: p.unrealizedPnlPct });
  }
  let room = c.maxOpenPositions - positions.length;
  if (room <= 0) return { signals };
  const ranked = c.universe
    .map((symbol) => {
      const b = bars.get(symbol) ?? [];
      return { symbol, b, r24: pctReturn(b, 24), r1: pctReturn(b, 1), vr: volumeRatio(b, 6, 24) };
    })
    .filter((x) => x.r24 !== null && x.r1 !== null)
    .sort((a, b) => (b.r24 ?? 0) - (a.r24 ?? 0))
    .slice(0, c.topN);
  for (const x of ranked) {
    if (room <= 0) break;
    if (positions.some((p) => p.symbol === x.symbol)) continue;
    if (recentlyEntered(x.symbol, recent, c.minEntryIntervalHours, now)) continue;
    if ((x.r24 ?? 0) < c.minRet24hPct || (x.r1 ?? 0) <= 0 || (x.vr ?? 0) < c.minVolumeRatio) continue;
    const last = x.b[x.b.length - 1];
    signals.push({
      type: "entry",
      symbol: x.symbol,
      side: "buy",
      reason: `Trending: 24h ${x.r24!.toFixed(2)}% (top ${c.topN}), last hour +${x.r1!.toFixed(2)}%, volume ${x.vr!.toFixed(2)}×`,
      qty: (equity * (c.positionSizePct / 100)) / last.close,
    });
    room--;
  }
  return { signals };
}
