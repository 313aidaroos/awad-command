/**
 * scalp-v1 (PHANTOM lane, 2026-10-02): short-term scalping on CLOSED 15-minute bars. PURE.
 * Entry: last 15m close above EMA9 above EMA21 (15m), green bar, 15m return ≥ minBarReturnPct, volume ≥ k× the
 * previous 16 bars. Exits: tight target/stop or max hold (minutes). Every 5-minute tick re-checks exits.
 */
import type { Bar, Position, RecentEntry, Signal } from "../types";
import { emaLast, heldHours, pctReturn, recentlyEntered, volumeRatio } from "./indicators";

export type ScalpConfig = {
  universe: string[];
  minBarReturnPct: number;
  minVolumeRatio: number;
  takeProfitPct: number;
  stopLossPct: number;
  maxHoldMinutes: number;
  positionSizePct: number;
  maxOpenPositions: number;
  minEntryIntervalHours: number;
};

export function runScalpStrategy(c: ScalpConfig, bars15m: Map<string, Bar[]>, positions: Position[], recent: RecentEntry[], equity: number, now: number): { signals: Signal[] } {
  const signals: Signal[] = [];
  for (const p of positions) {
    const mins = heldHours(p.enteredAt, now) * 60;
    const reason =
      p.unrealizedPnlPct <= c.stopLossPct ? `Scalp stop: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≤ ${c.stopLossPct}%`
      : p.unrealizedPnlPct >= c.takeProfitPct ? `Scalp target: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≥ ${c.takeProfitPct}%`
      : mins >= c.maxHoldMinutes ? `Scalp time exit: ${mins.toFixed(0)} min ≥ ${c.maxHoldMinutes} min`
      : null;
    if (reason) signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason, pnlPct: p.unrealizedPnlPct });
  }
  let room = c.maxOpenPositions - positions.length;
  for (const symbol of c.universe) {
    if (room <= 0) break;
    if (positions.some((p) => p.symbol === symbol)) continue;
    if (recentlyEntered(symbol, recent, c.minEntryIntervalHours, now)) continue;
    const b = bars15m.get(symbol) ?? [];
    if (b.length < 25) continue;
    const last = b[b.length - 1];
    const e9 = emaLast(b, 9);
    const e21 = emaLast(b, 21);
    const r = pctReturn(b, 1);
    const vr = volumeRatio(b, 1, 16);
    if (e9 === null || e21 === null || r === null || vr === null) continue;
    if (last.close > e9 && e9 > e21 && last.close > last.open && r >= c.minBarReturnPct && vr >= c.minVolumeRatio) {
      signals.push({ type: "entry", symbol, side: "buy", reason: `15m scalp: +${r.toFixed(2)}% bar on ${vr.toFixed(1)}× volume above EMA9/21`, qty: (equity * (c.positionSizePct / 100)) / last.close });
      room--;
    }
  }
  return { signals };
}
