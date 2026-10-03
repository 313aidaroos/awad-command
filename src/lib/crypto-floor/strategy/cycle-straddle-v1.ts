/**
 * cycle-straddle-v1 (CYCLE desk, 2026-10-03, Awad's idea): prices move in a ~3-week cycle, so buy volatility once a
 * week and let either side of the swing pay. PURE (no I/O).
 *
 * - Entry: every MONDAY (New York date; the engine only plans options in the regular session) one long ATM straddle
 *   (a call AND a put, same strike, same expiry, ~4 weeks out) per underlying: SPY and QQQ always, plus liquid
 *   stocks whose 1-year daily bars show a real ~15-trading-day cycle (detectCycle below). LONG PREMIUM ONLY: this
 *   file only ever emits buys for new straddles and sells of legs the desk already holds. Never sells to open.
 * - Size: the engine picks the contracts and sizes the pair so the whole debit (call + put) × 100 × contracts is at
 *   most STRADDLE_MAX_DEBIT_USD ($500, risk.ts). Max `maxOpenStraddles` (4) straddles open at once.
 * - Exits: each leg is sold on its own at +legTakePct (50%). A straddle whose open legs are down comboStopPct (−50%)
 *   combined is closed. Any leg still open on trading day `timeExitDay` (15) after entry is sold (hard time exit).
 * The desk's hard daily loss cap and the floor-owned cf-/rc- reconcile rules apply as on every desk (engine.ts).
 */
import { daysToExpiry, parseOcc } from "../assets";
import type { Bar, Position, RecentEntry, Signal } from "../types";

/** Always traded (liquid index ETFs); cycle-qualified stocks are added on top. */
export const CYCLE_BASE_UNDERLYINGS = ["SPY", "QQQ"] as const;
/**
 * Liquid optionable stocks the cycle detector screens every week. The first row is the floor's stock list; the second
 * row is lower-priced names with deep option markets, because a ~4-week ATM straddle on SPY/QQQ/NVDA usually costs
 * well over the $500 cap (SPY ≈ $2,000) and is then skipped. CYCLE only trades these as options, never as shares.
 */
export const CYCLE_CANDIDATES = [
  "NVDA", "TSLA", "AAPL", "AMD", "META", "MSFT", "AMZN", "COIN", "MSTR", "PLTR",
  "F", "BAC", "T", "PFE", "INTC", "SOFI", "AAL",
] as const;

/**
 * Cycle detector settings. A "real" cycle needs BOTH: the autocorrelation of the detrended log price peaks at a lag in
 * the band (and is negative at half that lag, i.e. it really swings), AND that band holds a large share of the
 * spectral power. Calibrated on synthetic 1-year series (cycle-straddle.test.ts): ~0.2% of pure random walks qualify;
 * a 3% swing with a 15-day period under 1.5% daily noise qualifies about two times in three; 8- and 30-day swings never.
 */
export const CYCLE_DETECTOR = {
  /** Trading days of history needed (≈ 1 year = 252). */
  minBars: 200,
  /** Use at most this many daily bars (1 year). */
  maxBars: 252,
  /** Detrend window: log close minus its centered moving average over this many days (removes the trend). */
  detrendDays: 31,
  /** The ~15-trading-day band (≈ 3 weeks). */
  minPeriod: 12,
  maxPeriod: 18,
  /** Spectrum is compared over these periods (days). */
  spectrumMinPeriod: 4,
  spectrumMaxPeriod: 60,
  minAutocorr: 0.15,
  minSpectralShare: 0.2,
} as const;

export type CycleRead = {
  symbol: string;
  /** Lag (trading days) where the autocorrelation peaks inside the band; null without enough data. */
  period: number | null;
  /** Autocorrelation at that lag (−1…1). */
  autocorr: number | null;
  /** Share of spectral power (periods 4–60) that sits in the 12–18 day band (0…1). */
  spectralShare: number | null;
  /** 0…1: mean of the autocorrelation and spectral share (when both pass their floor), else 0. */
  score: number;
  qualifies: boolean;
  /** Daily bars used. */
  bars: number;
};

function centeredMovingAverage(xs: number[], window: number): Array<number | null> {
  const half = Math.floor(window / 2);
  return xs.map((_, i) => {
    if (i - half < 0 || i + half >= xs.length) return null;
    let s = 0;
    for (let j = i - half; j <= i + half; j++) s += xs[j];
    return s / (2 * half + 1);
  });
}

function autocorr(xs: number[], lag: number): number {
  const n = xs.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) den += xs[i] * xs[i];
  for (let i = 0; i + lag < n; i++) num += xs[i] * xs[i + lag];
  return den > 0 ? num / den : 0;
}

function power(xs: number[], period: number): number {
  const w = (2 * Math.PI) / period;
  let re = 0;
  let im = 0;
  for (let i = 0; i < xs.length; i++) {
    re += xs[i] * Math.cos(w * i);
    im -= xs[i] * Math.sin(w * i);
  }
  return re * re + im * im;
}

/** Is there a real ~15-trading-day cycle in these daily bars (oldest first)? */
export function detectCycle(symbol: string, daily: Bar[], c: typeof CYCLE_DETECTOR = CYCLE_DETECTOR): CycleRead {
  const bars = daily.slice(-c.maxBars).filter((b) => b.close > 0);
  const empty: CycleRead = { symbol, period: null, autocorr: null, spectralShare: null, score: 0, qualifies: false, bars: bars.length };
  if (bars.length < c.minBars) return empty;
  const logs = bars.map((b) => Math.log(b.close));
  const ma = centeredMovingAverage(logs, c.detrendDays);
  const raw = logs.flatMap((v, i) => (ma[i] === null ? [] : [v - (ma[i] as number)]));
  if (raw.length < 4 * c.maxPeriod) return empty;
  const mean = raw.reduce((s, v) => s + v, 0) / raw.length;
  const x = raw.map((v) => v - mean);
  let best = { lag: c.minPeriod, r: -Infinity };
  for (let lag = c.minPeriod; lag <= c.maxPeriod; lag++) {
    const r = autocorr(x, lag);
    if (r > best.r) best = { lag, r };
  }
  const half = autocorr(x, Math.round(best.lag / 2));
  let band = 0;
  let total = 0;
  for (let p = c.spectrumMinPeriod; p <= c.spectrumMaxPeriod; p += 0.5) {
    const pw = power(x, p);
    total += pw;
    if (p >= c.minPeriod && p <= c.maxPeriod) band += pw;
  }
  const share = total > 0 ? band / total : 0;
  const qualifies = best.r >= c.minAutocorr && half < 0 && share >= c.minSpectralShare;
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return { symbol, period: best.lag, autocorr: round(best.r), spectralShare: round(share), score: qualifies ? round((best.r + share) / 2) : 0, qualifies, bars: bars.length };
}

export type CycleScan = {
  /** Underlyings CYCLE may open straddles on this week: SPY, QQQ, then qualified stocks by score. */
  underlyings: string[];
  reads: CycleRead[];
};

/** Run the detector on SPY/QQQ + the candidates. SPY/QQQ are traded regardless of their read. */
export function scanCycles(daily: Map<string, Bar[]>): CycleScan {
  const reads = [...CYCLE_BASE_UNDERLYINGS, ...CYCLE_CANDIDATES].map((s) => detectCycle(s, daily.get(s) ?? []));
  const picked = reads.filter((r) => r.qualifies && !(CYCLE_BASE_UNDERLYINGS as readonly string[]).includes(r.symbol)).sort((a, b) => b.score - a.score).map((r) => r.symbol);
  return { underlyings: [...CYCLE_BASE_UNDERLYINGS, ...picked], reads };
}

const nyFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" });

function nyDay(ms: number): { weekday: string; ymd: string } {
  const p = Object.fromEntries(nyFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { weekday: p.weekday, ymd: `${p.year}-${p.month}-${p.day}` };
}

/** Monday in New York (the engine adds: regular session only, so a Monday holiday means no entry that week). */
export function isNyMonday(now: number): boolean {
  return nyDay(now).weekday === "Mon";
}

/**
 * Trading days since entry (New York weekdays after the entry date, up to and including today). Entry Monday → the
 * Monday three weeks later is day 15. Exchange holidays are counted as trading days, so a holiday makes the time exit
 * at most one day EARLIER, never later.
 */
export function tradingDaysHeld(enteredAt: string | undefined, now: number): number {
  const start = enteredAt ? Date.parse(enteredAt) : NaN;
  if (!Number.isFinite(start) || now <= start) return 0;
  const end = nyDay(now).ymd;
  let n = 0;
  // Walk calendar days at New York noon to avoid DST edges.
  let d = Date.parse(`${nyDay(start).ymd}T17:00:00Z`);
  for (let i = 0; i < 400; i++) {
    d += 86_400_000;
    const day = nyDay(d);
    if (day.ymd > end) break;
    if (day.weekday !== "Sat" && day.weekday !== "Sun") n++;
  }
  return n;
}

export type CycleConfig = {
  underlyings: string[];
  legTakePct: number;
  comboStopPct: number;
  timeExitDay: number;
  maxOpenStraddles: number;
};

export type StraddleLeg = { symbol: string; right: "call" | "put"; qty: number; cost: number; value: number; pnlPct: number };
export type OpenStraddle = {
  key: string;
  underlying: string;
  strike: number;
  expiration: string;
  enteredAt: string | null;
  legs: StraddleLeg[];
  cost: number;
  value: number;
  pnlPct: number;
  tradingDaysHeld: number;
  daysToExpiry: number | null;
};

/** Group the desk's option legs into straddles (same underlying + strike + expiry). */
export function groupStraddles(positions: Position[], now: number): OpenStraddle[] {
  const groups = new Map<string, OpenStraddle>();
  for (const p of positions) {
    const o = parseOcc(p.symbol);
    if (!o) continue;
    const key = `${o.underlying}|${o.expiration}|${o.strike}`;
    const cost = p.qty * p.avgEntryPrice;
    const value = p.qty * p.currentPrice;
    const g = groups.get(key) ?? { key, underlying: o.underlying, strike: o.strike, expiration: o.expiration, enteredAt: null, legs: [], cost: 0, value: 0, pnlPct: 0, tradingDaysHeld: 0, daysToExpiry: daysToExpiry(p.symbol, now) };
    g.legs.push({ symbol: p.symbol, right: o.right, qty: p.qty, cost, value, pnlPct: p.unrealizedPnlPct });
    g.cost += cost;
    g.value += value;
    if (p.enteredAt && (!g.enteredAt || p.enteredAt < g.enteredAt)) g.enteredAt = p.enteredAt;
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    legs: g.legs.sort((a, b) => a.right.localeCompare(b.right)),
    pnlPct: g.cost > 0 ? ((g.value - g.cost) / g.cost) * 100 : 0,
    tradingDaysHeld: tradingDaysHeld(g.enteredAt ?? undefined, now),
  }));
}

export function runCycleStraddle(c: CycleConfig, positions: Position[], recent: RecentEntry[], now: number): { signals: Signal[] } {
  const signals: Signal[] = [];
  const straddles = groupStraddles(positions, now);
  for (const s of straddles) {
    const timeUp = s.tradingDaysHeld >= c.timeExitDay;
    const comboDown = s.pnlPct <= c.comboStopPct;
    for (const leg of s.legs) {
      // Closing sells of LONG legs the desk holds (the engine caps qty at the ledger AND the broker's long qty).
      const reason = timeUp
        ? `Day-${c.timeExitDay} time exit: ${s.underlying} ${s.strike} straddle held ${s.tradingDaysHeld} trading days`
        : comboDown
          ? `Straddle stop: ${s.underlying} ${s.strike} straddle ${s.pnlPct.toFixed(1)}% ≤ ${c.comboStopPct}% combined`
          : leg.pnlPct >= c.legTakePct
            ? `Leg target: ${leg.right} +${leg.pnlPct.toFixed(1)}% ≥ +${c.legTakePct}% (other leg rides)`
            : null;
      if (reason) signals.push({ type: "exit", symbol: leg.symbol, side: "sell", reason, pnlPct: leg.pnlPct, straddle: s.key });
    }
  }
  if (!isNyMonday(now)) return { signals };
  if (straddles.length >= c.maxOpenStraddles) return { signals };
  const held = new Set(straddles.map((s) => s.underlying));
  // One straddle per underlying per Monday: anything entered in the last 4 days blocks a repeat.
  const recentUnderlyings = new Set(
    recent.filter((e) => Date.parse(e.timestamp) > now - 4 * 86_400_000).map((e) => parseOcc(e.symbol)?.underlying ?? e.symbol),
  );
  // Every eligible underlying gets a signal, in priority order; the engine opens them until the desk holds
  // maxOpenStraddles (an underlying whose straddle is over the $500 cap must not use up the week's room).
  for (const u of c.underlyings) {
    if (held.has(u) || recentUnderlyings.has(u)) continue;
    signals.push({ type: "entry", symbol: u, side: "buy", optionRight: "straddle", maxOpenStraddles: c.maxOpenStraddles, reason: `Monday straddle: long ATM call + put on ${u} (~4 weeks), riding the ~3-week cycle` });
  }
  return { signals };
}

/** New York date (YYYY-MM-DD) of CYCLE's next entry Monday: today when it is Monday before the 16:00 ET close. */
export function nextEntryMonday(now: number): string {
  const etHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hourCycle: "h23" }).format(new Date(now)));
  if (isNyMonday(now) && etHour < 16) return nyDay(now).ymd;
  let d = Date.parse(`${nyDay(now).ymd}T17:00:00Z`);
  for (let i = 0; i < 8; i++) {
    d += 86_400_000;
    if (nyDay(d).weekday === "Mon") return nyDay(d).ymd;
  }
  return nyDay(d).ymd; // unreachable
}
