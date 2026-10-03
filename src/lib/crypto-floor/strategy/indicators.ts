/** Small indicator helpers for the 2026-10-02 lanes (trend/meanrev/scalp/options). PURE. */
import { ema } from "../market";
import type { Bar } from "../types";

export function sma(values: number[], period: number): number | null {
  if (period < 1 || values.length < period) return null;
  return values.slice(-period).reduce((s, v) => s + v, 0) / period;
}

export function stdev(values: number[], period: number): number | null {
  const m = sma(values, period);
  if (m === null) return null;
  const xs = values.slice(-period);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / period);
}

/** Wilder RSI on closes; null until period+1 closes. */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgG = gain / period;
  let avgL = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + Math.max(0, d)) / period;
    avgL = (avgL * (period - 1) + Math.max(0, -d)) / period;
  }
  if (avgL === 0) return 100;
  return 100 - 100 / (1 + avgG / avgL);
}

export function pctReturn(bars: Bar[], back: number): number | null {
  if (bars.length < back + 1) return null;
  const from = bars[bars.length - 1 - back].close;
  const to = bars[bars.length - 1].close;
  return from > 0 ? ((to - from) / from) * 100 : null;
}

/** Average volume of the last `recent` bars ÷ average of the `base` bars before them. */
export function volumeRatio(bars: Bar[], recent: number, base: number): number | null {
  if (bars.length < recent + base) return null;
  const r = bars.slice(-recent);
  const b = bars.slice(-(recent + base), -recent);
  const avg = (xs: Bar[]) => xs.reduce((s, x) => s + x.volume, 0) / xs.length;
  const bv = avg(b);
  return bv > 0 ? avg(r) / bv : null;
}

/** Bars since the fast EMA last crossed the slow EMA (0 = on the last bar), with the direction. */
export function lastCross(bars: Bar[], fast: number, slow: number, lookback: number): { dir: "up" | "down"; barsAgo: number } | null {
  const closes = bars.map((b) => b.close);
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const n = closes.length;
  for (let k = 0; k < lookback; k++) {
    const i = n - 1 - k;
    if (i < 1 || !Number.isFinite(f[i - 1]) || !Number.isFinite(s[i - 1])) break;
    const prevAbove = f[i - 1] > s[i - 1];
    const nowAbove = f[i] > s[i];
    if (!prevAbove && nowAbove) return { dir: "up", barsAgo: k };
    if (prevAbove && !nowAbove) return { dir: "down", barsAgo: k };
  }
  return null;
}

export function emaLast(bars: Bar[], period: number): number | null {
  const e = ema(bars.map((b) => b.close), period);
  const v = e[e.length - 1];
  return Number.isFinite(v) ? v : null;
}

export const recentlyEntered = (symbol: string, entries: Array<{ symbol: string; timestamp: string }>, hours: number, now: number) =>
  entries.some((e) => e.symbol === symbol && Date.parse(e.timestamp) > now - hours * 3_600_000);

export const heldHours = (enteredAt: string | undefined, now: number) => (enteredAt ? (now - Date.parse(enteredAt)) / 3_600_000 : 0);
