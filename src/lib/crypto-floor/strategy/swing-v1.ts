/**
 * Crypto Floor: Swing V1 (ORBIT desk). Pure function, unit-tested.
 *
 * Trend swing on closed 1h bars:
 * ENTRY: fast EMA crosses ABOVE slow EMA on the last closed bar, no open position in the symbol,
 *        no entry in the last `minEntryIntervalHours`, under `maxOpenPositions`. Size `positionSizePct` of equity.
 * EXIT:  fast EMA crosses BELOW slow EMA, OR P&L ≤ stopLossPct, OR P&L ≥ takeProfitPct.
 */
import { ema } from "../market";
import { lastCross } from "./indicators";
import type { Bar, Position, RecentEntry, Signal } from "../types";

export type SwingConfig = {
  universe: string[];
  fastEma: number;
  slowEma: number;
  takeProfitPct: number;
  stopLossPct: number;
  positionSizePct: number;
  maxOpenPositions: number;
  minEntryIntervalHours: number;
  /** 2026-10-02: also enter when the up-cross happened within the last N closed bars (1 = only the last bar, v1). */
  crossLookbackBars?: number;
  /** 2026-10-02: also enter on a green hour that closes above the fast EMA while fast > slow (trend continuation). */
  trendEntry?: boolean;
};

export const defaultSwingConfig: SwingConfig = {
  universe: ["BTC/USD", "ETH/USD", "SOL/USD"],
  fastEma: 20,
  slowEma: 50,
  takeProfitPct: 6.0,
  stopLossPct: -3.0,
  positionSizePct: 2.0,
  maxOpenPositions: 3,
  minEntryIntervalHours: 12,
};

export type Cross = "up" | "down" | null;

/** Cross on the last bar: compares the last two EMA values. */
export function emaCross(bars: Bar[], fast: number, slow: number): { cross: Cross; fast: number | null; slow: number | null } {
  const closes = bars.map((b) => b.close);
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const n = closes.length;
  if (n < slow + 1 || !Number.isFinite(f[n - 2]) || !Number.isFinite(s[n - 2])) {
    return { cross: null, fast: Number.isFinite(f[n - 1]) ? f[n - 1] : null, slow: Number.isFinite(s[n - 1]) ? s[n - 1] : null };
  }
  const prevAbove = f[n - 2] > s[n - 2];
  const nowAbove = f[n - 1] > s[n - 1];
  return {
    cross: !prevAbove && nowAbove ? "up" : prevAbove && !nowAbove ? "down" : null,
    fast: f[n - 1],
    slow: s[n - 1],
  };
}

export function runSwingStrategy(
  config: SwingConfig,
  bars1h: Map<string, Bar[]>,
  positions: Position[],
  recentEntries: RecentEntry[],
  equity: number,
  now: number = Date.now(),
): { signals: Signal[] } {
  const signals: Signal[] = [];

  for (const p of positions) {
    if (!config.universe.includes(p.symbol)) continue;
    const bars = bars1h.get(p.symbol) ?? [];
    const { cross } = emaCross(bars, config.fastEma, config.slowEma);
    if (p.unrealizedPnlPct <= config.stopLossPct) {
      signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason: `Stop loss: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≤ ${config.stopLossPct}%`, pnlPct: p.unrealizedPnlPct });
    } else if (p.unrealizedPnlPct >= config.takeProfitPct) {
      signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason: `Take profit: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≥ ${config.takeProfitPct}%`, pnlPct: p.unrealizedPnlPct });
    } else if (cross === "down") {
      signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason: `Trend exit: EMA${config.fastEma} crossed below EMA${config.slowEma}`, pnlPct: p.unrealizedPnlPct });
    }
  }

  if (positions.length >= config.maxOpenPositions) return { signals };
  const cutoff = now - config.minEntryIntervalHours * 60 * 60 * 1000;

  let room = config.maxOpenPositions - positions.length;
  for (const symbol of config.universe) {
    if (room <= 0) break;
    if (positions.some((p) => p.symbol === symbol)) continue;
    if (recentEntries.some((e) => e.symbol === symbol && Date.parse(e.timestamp) > cutoff)) continue;
    const bars = bars1h.get(symbol) ?? [];
    const { cross, fast, slow } = emaCross(bars, config.fastEma, config.slowEma);
    const last = bars[bars.length - 1];
    if (!last) continue;
    let reason: string | null = null;
    if (cross === "up") {
      reason = `EMA${config.fastEma} (${fast?.toFixed(2)}) crossed above EMA${config.slowEma} (${slow?.toFixed(2)})`;
    } else if (fast !== null && slow !== null && fast > slow && bars.length > config.slowEma) {
      const lookback = Math.max(1, Math.floor(config.crossLookbackBars ?? 1));
      const recent = lookback > 1 ? lastCross(bars, config.fastEma, config.slowEma, lookback) : null;
      const prev = bars[bars.length - 2];
      if (recent?.dir === "up" && last.close > fast) {
        reason = `EMA${config.fastEma} crossed above EMA${config.slowEma} ${recent.barsAgo}h ago, price still above EMA${config.fastEma}`;
      } else if (config.trendEntry && last.close > fast && last.close > last.open && prev && last.close > prev.close) {
        reason = `Uptrend continuation: EMA${config.fastEma} (${fast.toFixed(2)}) > EMA${config.slowEma} (${slow.toFixed(2)}), green hour above EMA${config.fastEma}`;
      }
    }
    if (!reason) continue;
    const qty = (equity * (config.positionSizePct / 100)) / last.close;
    signals.push({ type: "entry", symbol, side: "buy", reason, qty });
    room--;
  }
  return { signals };
}
