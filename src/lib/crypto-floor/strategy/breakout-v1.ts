/**
 * Crypto Floor: Breakout V1 (PHANTOM desk). Pure function, unit-tested.
 *
 * Event-style breakout on closed 1h bars (no news feed is connected, so volume is the "event"):
 * ENTRY: last closed bar CLOSES above the highest high of the previous `lookbackHours` bars AND its volume is
 *        ≥ `volumeMultiple` × the average volume of those bars. No open position, no entry in the last
 *        `minEntryIntervalHours`, under `maxOpenPositions`. Size `positionSizePct` of equity.
 * EXIT:  P&L ≥ takeProfitPct, P&L ≤ stopLossPct, or held longer than `maxHoldHours` (any P&L).
 */
import type { Bar, Position, RecentEntry, Signal } from "../types";

export type BreakoutConfig = {
  universe: string[];
  lookbackHours: number;
  volumeMultiple: number;
  takeProfitPct: number;
  stopLossPct: number;
  maxHoldHours: number;
  positionSizePct: number;
  maxOpenPositions: number;
  minEntryIntervalHours: number;
};

export const defaultBreakoutConfig: BreakoutConfig = {
  universe: ["BTC/USD", "ETH/USD", "SOL/USD"],
  lookbackHours: 24,
  volumeMultiple: 2.0,
  takeProfitPct: 2.5,
  stopLossPct: -1.5,
  maxHoldHours: 24,
  positionSizePct: 2.0,
  maxOpenPositions: 3,
  minEntryIntervalHours: 6,
};

export function breakoutRead(bars: Bar[], lookback: number) {
  if (bars.length < lookback + 1) return null;
  const last = bars[bars.length - 1];
  const prior = bars.slice(-(lookback + 1), -1);
  const priorHigh = Math.max(...prior.map((b) => b.high));
  const avgVolume = prior.reduce((s, b) => s + b.volume, 0) / prior.length;
  return {
    last,
    priorHigh,
    avgVolume,
    volumeRatio: avgVolume > 0 ? last.volume / avgVolume : null,
    closedAbove: last.close > priorHigh,
  };
}

export function runBreakoutStrategy(
  config: BreakoutConfig,
  bars1h: Map<string, Bar[]>,
  positions: Position[],
  recentEntries: RecentEntry[],
  equity: number,
  now: number = Date.now(),
): { signals: Signal[] } {
  const signals: Signal[] = [];

  for (const p of positions) {
    if (!config.universe.includes(p.symbol)) continue;
    const held = p.enteredAt ? (now - Date.parse(p.enteredAt)) / 3_600_000 : 0;
    if (p.unrealizedPnlPct >= config.takeProfitPct) {
      signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason: `Take profit: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≥ ${config.takeProfitPct}%`, pnlPct: p.unrealizedPnlPct });
    } else if (p.unrealizedPnlPct <= config.stopLossPct) {
      signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason: `Stop loss: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≤ ${config.stopLossPct}%`, pnlPct: p.unrealizedPnlPct });
    } else if (held > config.maxHoldHours) {
      signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason: `Time exit: held ${held.toFixed(1)}h > ${config.maxHoldHours}h (P&L ${p.unrealizedPnlPct.toFixed(2)}%)`, pnlPct: p.unrealizedPnlPct, hoursHeld: held });
    }
  }

  if (positions.length >= config.maxOpenPositions) return { signals };
  const cutoff = now - config.minEntryIntervalHours * 60 * 60 * 1000;

  for (const symbol of config.universe) {
    if (positions.some((p) => p.symbol === symbol)) continue;
    if (recentEntries.some((e) => e.symbol === symbol && Date.parse(e.timestamp) > cutoff)) continue;
    const read = breakoutRead(bars1h.get(symbol) ?? [], config.lookbackHours);
    if (!read || !read.closedAbove || read.volumeRatio === null || read.volumeRatio < config.volumeMultiple) continue;
    const qty = (equity * (config.positionSizePct / 100)) / read.last.close;
    signals.push({
      type: "entry",
      symbol,
      side: "buy",
      reason: `Breakout: closed ${read.last.close} above ${config.lookbackHours}h high ${read.priorHigh} on ${read.volumeRatio.toFixed(1)}× volume`,
      qty,
      volumeRatio: read.volumeRatio,
    });
  }
  return { signals };
}
