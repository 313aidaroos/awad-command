/**
 * Crypto Floor: custom-v1 — a strategy written by a team in a small rule language. PURE, unit-tested.
 *
 * The AI never writes code. A team (RONIN first) describes a strategy as JSON: indicators computed by this file,
 * entry conditions, exits and sizing. validateSpec() checks every field against hard limits for the team's risk
 * profile before anything trades; runCustomStrategy() evaluates it deterministically on closed hourly bars.
 *
 * Indicators (all on CLOSED hourly bars):
 *   return{hours}            % change of the close over the last N hours
 *   distFromHigh{hours}      % of the close below the N-hour high (0 or negative)
 *   distFromLow{hours}       % of the close above the N-hour low (0 or positive)
 *   emaGap{fast,slow}        (EMA fast − EMA slow) / EMA slow, in %
 *   rsi{period}              Wilder RSI 0–100
 *   volumeRatio{hours}       last hour's volume ÷ average volume of the previous N hours
 *   volatility{hours}        standard deviation of hourly % returns over N hours
 *   greenStreak{}            consecutive green closed hours (negative = red streak)
 * Entry: every `all` condition true AND (if `any` given) at least one `any` condition true.
 * Exit: take profit, stop loss, optional trailing stop from the best close since entry, optional max hold,
 *       optional `exitWhen` (any condition true → exit).
 */
import { ema } from "../market";
import type { Bar, Position, RecentEntry, Signal } from "../types";

export const INDICATOR_KINDS = ["return", "distFromHigh", "distFromLow", "emaGap", "rsi", "volumeRatio", "volatility", "greenStreak"] as const;
export type IndicatorKind = (typeof INDICATOR_KINDS)[number];

export type Indicator =
  | { kind: "return" | "distFromHigh" | "distFromLow" | "volumeRatio" | "volatility"; hours: number }
  | { kind: "emaGap"; fast: number; slow: number }
  | { kind: "rsi"; period: number }
  | { kind: "greenStreak" };

export type Condition = { ind: Indicator; op: ">" | "<" | ">=" | "<="; value: number };

export type CustomSpec = {
  name: string;
  thesis: string;
  universe: string[];
  entry: { all: Condition[]; any?: Condition[] };
  exit: { takeProfitPct: number; stopLossPct: number; trailingStopPct?: number; maxHoldHours?: number; exitWhen?: Condition[] };
  sizing: { positionSizePct: number; maxOpenPositions: number; minEntryIntervalHours: number };
};

export type SpecLimits = {
  allowedUniverse: string[];
  maxPositionSizePct: number;
  maxOpenPositions: number;
  minStopLossPct: number; // most negative allowed, e.g. -25
  maxTakeProfitPct: number;
  maxConditions: number;
};

/** RONIN's limits (riskier team). Other teams don't use custom specs. */
export const RONIN_UNIVERSE = ["XRP/USD", "DOGE/USD", "SOL/USD", "PEPE/USD", "XLM/USD", "HBAR/USD", "BILL/USD", "BTC/USD", "ETH/USD", "AVAX/USD", "LINK/USD", "LTC/USD"];
export const RONIN_LIMITS: SpecLimits = {
  allowedUniverse: RONIN_UNIVERSE,
  maxPositionSizePct: 10,
  maxOpenPositions: 4,
  minStopLossPct: -25,
  maxTakeProfitPct: 50,
  maxConditions: 6,
};

const OPS = new Set([">", "<", ">=", "<="]);
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const int = (x: unknown, lo: number, hi: number) => isNum(x) && Number.isInteger(x) && x >= lo && x <= hi;

function checkIndicator(raw: unknown, path: string, errors: string[]): Indicator | null {
  if (!raw || typeof raw !== "object") {
    errors.push(`${path}: indicator must be an object`);
    return null;
  }
  const r = raw as Record<string, unknown>;
  const kind = r.kind as IndicatorKind;
  if (!INDICATOR_KINDS.includes(kind)) {
    errors.push(`${path}.kind must be one of ${INDICATOR_KINDS.join(", ")}`);
    return null;
  }
  if (kind === "greenStreak") return { kind };
  if (kind === "rsi") {
    if (!int(r.period, 2, 50)) errors.push(`${path}.period must be a whole number 2–50`);
    return { kind, period: Number(r.period) };
  }
  if (kind === "emaGap") {
    if (!int(r.fast, 2, 100) || !int(r.slow, 3, 200) || Number(r.fast) >= Number(r.slow)) errors.push(`${path}: emaGap needs whole numbers fast < slow (fast 2–100, slow 3–200)`);
    return { kind, fast: Number(r.fast), slow: Number(r.slow) };
  }
  if (!int(r.hours, 1, 168)) errors.push(`${path}.hours must be a whole number 1–168`);
  return { kind, hours: Number(r.hours) } as Indicator;
}

function checkConditions(raw: unknown, path: string, limits: SpecLimits, errors: string[], required: boolean): Condition[] {
  if (raw === undefined && !required) return [];
  if (!Array.isArray(raw)) {
    errors.push(`${path} must be a list of conditions`);
    return [];
  }
  if (required && raw.length === 0) errors.push(`${path} needs at least one condition`);
  if (raw.length > limits.maxConditions) errors.push(`${path} has more than ${limits.maxConditions} conditions`);
  return raw.slice(0, limits.maxConditions).flatMap((c, i) => {
    const p = `${path}[${i}]`;
    if (!c || typeof c !== "object") {
      errors.push(`${p} must be {ind, op, value}`);
      return [];
    }
    const cc = c as Record<string, unknown>;
    const ind = checkIndicator(cc.ind, `${p}.ind`, errors);
    if (!OPS.has(String(cc.op))) errors.push(`${p}.op must be > < >= <=`);
    if (!isNum(cc.value)) errors.push(`${p}.value must be a number`);
    return ind ? [{ ind, op: cc.op as Condition["op"], value: Number(cc.value) }] : [];
  });
}

/** Validate a spec written by a team. Nothing is clamped: any out-of-limit value is an error. */
export function validateSpec(raw: unknown, limits: SpecLimits = RONIN_LIMITS): { ok: true; spec: CustomSpec } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["spec must be an object"] };
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim().slice(0, 80) : "";
  const thesis = typeof r.thesis === "string" ? r.thesis.trim().slice(0, 500) : "";
  if (!name) errors.push("name is required");
  if (!thesis) errors.push("thesis is required (one or two sentences: why this should work)");
  const universe = Array.isArray(r.universe) ? [...new Set(r.universe.map((s) => String(s).toUpperCase()))] : [];
  if (!universe.length) errors.push("universe needs at least one coin");
  const bad = universe.filter((s) => !limits.allowedUniverse.includes(s));
  if (bad.length) errors.push(`coins not allowed: ${bad.join(", ")} (allowed: ${limits.allowedUniverse.join(", ")})`);
  const entryRaw = (r.entry ?? {}) as Record<string, unknown>;
  const all = checkConditions(entryRaw.all, "entry.all", limits, errors, true);
  const any = checkConditions(entryRaw.any, "entry.any", limits, errors, false);
  const ex = (r.exit ?? {}) as Record<string, unknown>;
  if (!isNum(ex.takeProfitPct) || ex.takeProfitPct < 0.3 || ex.takeProfitPct > limits.maxTakeProfitPct) errors.push(`exit.takeProfitPct must be 0.3–${limits.maxTakeProfitPct}`);
  if (!isNum(ex.stopLossPct) || ex.stopLossPct > -0.3 || ex.stopLossPct < limits.minStopLossPct) errors.push(`exit.stopLossPct must be ${limits.minStopLossPct} to −0.3 (a stop is mandatory)`);
  if (ex.trailingStopPct !== undefined && (!isNum(ex.trailingStopPct) || ex.trailingStopPct < 0.3 || ex.trailingStopPct > 30)) errors.push("exit.trailingStopPct must be 0.3–30");
  if (ex.maxHoldHours !== undefined && !int(ex.maxHoldHours, 1, 720)) errors.push("exit.maxHoldHours must be a whole number 1–720");
  const exitWhen = checkConditions(ex.exitWhen, "exit.exitWhen", limits, errors, false);
  const sz = (r.sizing ?? {}) as Record<string, unknown>;
  if (!isNum(sz.positionSizePct) || sz.positionSizePct < 0.5 || sz.positionSizePct > limits.maxPositionSizePct) errors.push(`sizing.positionSizePct must be 0.5–${limits.maxPositionSizePct}`);
  if (!int(sz.maxOpenPositions, 1, limits.maxOpenPositions)) errors.push(`sizing.maxOpenPositions must be 1–${limits.maxOpenPositions}`);
  if (!int(sz.minEntryIntervalHours, 0, 168)) errors.push("sizing.minEntryIntervalHours must be a whole number 0–168");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    spec: {
      name,
      thesis,
      universe,
      entry: { all, ...(any.length ? { any } : {}) },
      exit: {
        takeProfitPct: Number(ex.takeProfitPct),
        stopLossPct: Number(ex.stopLossPct),
        ...(ex.trailingStopPct !== undefined ? { trailingStopPct: Number(ex.trailingStopPct) } : {}),
        ...(ex.maxHoldHours !== undefined ? { maxHoldHours: Number(ex.maxHoldHours) } : {}),
        ...(exitWhen.length ? { exitWhen } : {}),
      },
      sizing: { positionSizePct: Number(sz.positionSizePct), maxOpenPositions: Number(sz.maxOpenPositions), minEntryIntervalHours: Number(sz.minEntryIntervalHours) },
    },
  };
}

// ── indicators ───────────────────────────────────────────────────────────────

function rsi(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (loss === 0) return gain === 0 ? 50 : 100;
  return 100 - 100 / (1 + gain / loss);
}

export function evalIndicator(ind: Indicator, bars: Bar[]): number | null {
  const n = bars.length;
  if (!n) return null;
  const last = bars[n - 1];
  switch (ind.kind) {
    case "return": {
      if (n <= ind.hours) return null;
      const ref = bars[n - 1 - ind.hours].close;
      return ref > 0 ? ((last.close - ref) / ref) * 100 : null;
    }
    case "distFromHigh": {
      if (n < ind.hours) return null;
      const hi = Math.max(...bars.slice(-ind.hours).map((b) => b.high));
      return hi > 0 ? ((last.close - hi) / hi) * 100 : null;
    }
    case "distFromLow": {
      if (n < ind.hours) return null;
      const lo = Math.min(...bars.slice(-ind.hours).map((b) => b.low));
      return lo > 0 ? ((last.close - lo) / lo) * 100 : null;
    }
    case "emaGap": {
      // A trailing window of 6× the slow length: the EMA seed's influence is gone (e^-10), and each hour stays cheap.
      const closes = bars.slice(-ind.slow * 6).map((b) => b.close);
      const f = ema(closes, ind.fast).at(-1);
      const s = ema(closes, ind.slow).at(-1);
      return f !== undefined && s !== undefined && Number.isFinite(f) && Number.isFinite(s) && s > 0 ? ((f - s) / s) * 100 : null;
    }
    case "rsi":
      // Wilder smoothing converges well within 10× the period; same window live and in backtests.
      return rsi(bars.slice(-(ind.period * 10 + 1)).map((b) => b.close), ind.period);
    case "volumeRatio": {
      if (n <= ind.hours) return null;
      const prior = bars.slice(-(ind.hours + 1), -1);
      const avg = prior.reduce((s, b) => s + b.volume, 0) / prior.length;
      return avg > 0 ? last.volume / avg : null;
    }
    case "volatility": {
      if (n <= ind.hours) return null;
      const w = bars.slice(-(ind.hours + 1));
      const rets = w.slice(1).map((b, i) => ((b.close - w[i].close) / w[i].close) * 100);
      const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
      return Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / rets.length);
    }
    case "greenStreak": {
      let k = 0;
      const green = last.close > last.open;
      for (let i = n - 1; i >= 0; i--) {
        if (bars[i].close > bars[i].open === green && bars[i].close !== bars[i].open) k++;
        else break;
      }
      return green ? k : -k;
    }
  }
}

export function checkCondition(c: Condition, bars: Bar[]): boolean {
  const v = evalIndicator(c.ind, bars);
  if (v === null) return false;
  switch (c.op) {
    case ">":
      return v > c.value;
    case "<":
      return v < c.value;
    case ">=":
      return v >= c.value;
    case "<=":
      return v <= c.value;
  }
}

export function describeCondition(c: Condition): string {
  const i = c.ind;
  const name =
    i.kind === "emaGap" ? `emaGap(${i.fast}/${i.slow})` : i.kind === "rsi" ? `rsi(${i.period})` : i.kind === "greenStreak" ? "greenStreak" : `${i.kind}(${i.hours}h)`;
  return `${name} ${c.op} ${c.value}`;
}

/** Hours of history the spec needs before it can decide. */
export function specWarmup(spec: CustomSpec): number {
  const conds = [...spec.entry.all, ...(spec.entry.any ?? []), ...(spec.exit.exitWhen ?? [])];
  let need = 2;
  for (const c of conds) {
    const i = c.ind;
    need = Math.max(need, i.kind === "emaGap" ? i.slow + 1 : i.kind === "rsi" ? i.period + 1 : i.kind === "greenStreak" ? 1 : i.hours + 1);
  }
  return need;
}

export function runCustomStrategy(
  spec: CustomSpec,
  bars1h: Map<string, Bar[]>,
  positions: Position[],
  recentEntries: RecentEntry[],
  equity: number,
  now: number = Date.now(),
): Signal[] {
  const signals: Signal[] = [];
  const exitRule = spec.exit;
  for (const p of positions) {
    if (!spec.universe.includes(p.symbol)) {
      // A coin the current strategy no longer trades (strategy changed): manage it with the stop/target only.
      if (p.unrealizedPnlPct <= exitRule.stopLossPct || p.unrealizedPnlPct >= exitRule.takeProfitPct) {
        signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason: `Legacy position exit at ${p.unrealizedPnlPct.toFixed(2)}%`, pnlPct: p.unrealizedPnlPct });
      }
      continue;
    }
    const bars = bars1h.get(p.symbol) ?? [];
    const held = p.enteredAt ? (now - Date.parse(p.enteredAt)) / 3_600_000 : 0;
    let reason: string | null = null;
    if (p.unrealizedPnlPct <= exitRule.stopLossPct) reason = `Stop loss: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≤ ${exitRule.stopLossPct}%`;
    else if (p.unrealizedPnlPct >= exitRule.takeProfitPct) reason = `Take profit: P&L ${p.unrealizedPnlPct.toFixed(2)}% ≥ ${exitRule.takeProfitPct}%`;
    else if (exitRule.trailingStopPct && p.enteredAt) {
      const since = bars.filter((b) => Date.parse(b.timestamp) >= Date.parse(p.enteredAt!));
      const peak = Math.max(p.avgEntryPrice, ...since.map((b) => b.close), p.currentPrice);
      const fromPeak = ((p.currentPrice - peak) / peak) * 100;
      if (peak > p.avgEntryPrice && fromPeak <= -exitRule.trailingStopPct) reason = `Trailing stop: ${fromPeak.toFixed(2)}% from best ${peak.toFixed(4)}`;
    }
    if (!reason && exitRule.maxHoldHours && held > exitRule.maxHoldHours) reason = `Time exit: held ${held.toFixed(1)}h > ${exitRule.maxHoldHours}h`;
    if (!reason && exitRule.exitWhen?.length) {
      const hit = exitRule.exitWhen.find((c) => checkCondition(c, bars));
      if (hit) reason = `Exit rule: ${describeCondition(hit)}`;
    }
    if (reason) signals.push({ type: "exit", symbol: p.symbol, side: "sell", reason, pnlPct: p.unrealizedPnlPct });
  }

  if (positions.length >= spec.sizing.maxOpenPositions) return signals;
  const cutoff = now - spec.sizing.minEntryIntervalHours * 3_600_000;
  let open = positions.length;
  for (const symbol of spec.universe) {
    if (open >= spec.sizing.maxOpenPositions) break;
    if (positions.some((p) => p.symbol === symbol)) continue;
    if (recentEntries.some((e) => e.symbol === symbol && Date.parse(e.timestamp) > cutoff)) continue;
    const bars = bars1h.get(symbol) ?? [];
    if (bars.length < specWarmup(spec)) continue;
    if (!spec.entry.all.every((c) => checkCondition(c, bars))) continue;
    if (spec.entry.any?.length && !spec.entry.any.some((c) => checkCondition(c, bars))) continue;
    const last = bars[bars.length - 1];
    signals.push({
      type: "entry",
      symbol,
      side: "buy",
      reason: `${spec.name}: ${[...spec.entry.all, ...(spec.entry.any ?? [])].map(describeCondition).join(" & ")}`,
      qty: (equity * (spec.sizing.positionSizePct / 100)) / last.close,
    });
    open++;
  }
  return signals;
}

/** RONIN's opening strategy, so it trades from day one. The team replaces it as it learns. */
export const RONIN_SEED_SPEC: CustomSpec = {
  name: "Volume ignition",
  thesis: "Strong 3-hour moves on heavy volume tend to continue for a few hours in crypto; ride them with a trailing stop and cut losers fast.",
  universe: RONIN_UNIVERSE,
  entry: {
    all: [
      { ind: { kind: "return", hours: 3 }, op: ">", value: 1.5 },
      { ind: { kind: "volumeRatio", hours: 24 }, op: ">", value: 1.5 },
      { ind: { kind: "rsi", period: 14 }, op: "<", value: 78 },
    ],
  },
  exit: { takeProfitPct: 6, stopLossPct: -4, trailingStopPct: 2.5, maxHoldHours: 48 },
  sizing: { positionSizePct: 8, maxOpenPositions: 4, minEntryIntervalHours: 6 },
};
