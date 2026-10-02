import type { Bar, WatchStat } from "./types";

export const HOUR_MS = 60 * 60 * 1000;

/**
 * Only bars whose hour has finished. Alpaca returns the in-progress hour as the last bar; using it as
 * "the last hour" makes 1h returns and green/red candles flicker for the whole hour.
 */
export function closedBars(bars: Bar[], now: number, frameMs = HOUR_MS): Bar[] {
  const seen = new Set<string>();
  return bars
    .filter((b) => {
      const t = Date.parse(b.timestamp);
      if (!Number.isFinite(t) || t + frameMs > now || seen.has(b.timestamp)) return false;
      seen.add(b.timestamp);
      return true;
    })
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

export function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / from) * 100;
}

/** Exponential moving average over closes. Returns one value per bar (NaN until `period` bars exist). */
export function ema(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(Number.NaN);
  if (period < 1 || values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Scout read for one symbol from closed hourly bars (+ optional live trade price). */
export function watchStat(
  symbol: string,
  bars: Bar[],
  live?: { price: number; at: string } | null,
): WatchStat {
  const last = bars.at(-1);
  const prev = bars.at(-2);
  const dayAgo = bars.length >= 25 ? bars[bars.length - 25] : undefined;
  const window = bars.slice(-24);
  const high24h = window.length ? Math.max(...window.map((b) => b.high)) : null;
  const price = live?.price ?? last?.close ?? null;
  return {
    symbol,
    price,
    priceAt: live?.at ?? (last ? last.timestamp : null),
    ret1h: last && prev ? pctChange(prev.close, last.close) : null,
    ret24h: last && dayAgo ? pctChange(dayAgo.close, price ?? last.close) : null,
    high24h,
    distFromHighPct: high24h && price ? pctChange(high24h, price) : null,
    lastHourGreen: last ? last.close > last.open : null,
    lastClosedBarAt: last?.timestamp ?? null,
  };
}

/** "BTC −3.1% (24h) · ETH −5.2% ✓ dip zone · SOL +1.0%" */
export function watchLine(stats: WatchStat[], dipThresholdPct = -4, dipFromHighPct = 0.95): string {
  return stats
    .map((s) => {
      const coin = s.symbol.split("/")[0];
      if (s.ret24h === null) return `${coin} —`;
      const r = `${s.ret24h > 0 ? "+" : ""}${s.ret24h.toFixed(1)}%`;
      const fromHigh = s.distFromHighPct;
      const dip =
        s.ret24h <= dipThresholdPct ||
        (fromHigh !== null && fromHigh <= (dipFromHighPct - 1) * 100);
      return `${coin} ${r} (24h)${dip ? " ✓ dip zone" : ""}`;
    })
    .join(" · ");
}

/** Alpaca wire symbol "BTCUSD" or "BTC/USD" → "BTC/USD". */
export function normalizePair(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s.includes("/")) return s;
  return s.endsWith("USD") ? `${s.slice(0, -3)}/USD` : s;
}

/** Next UTC midnight after `now`. */
export function nextUtcMidnight(now: number): Date {
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}
