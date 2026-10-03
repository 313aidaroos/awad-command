/**
 * Strategy registry: one entry per desk strategy, with defaults, hard bounds and a common run signature.
 * Bounds are guardrails (ADD 5): daily learning, desk agents and experiments can only move params inside them.
 * 2026-10-02 riskier floor: looser entries, bigger sizes (positionSizePct capped at 10 for the core desks), more open
 * positions, plus four side-by-side lanes (trend-v1, meanrev-v1, scalp-v1, options-v1). Loss caps are NOT params:
 * they live in risk.ts (owner-only). LEGACY_DEFAULTS: a stored desk param still equal to its pre-2026-10-02 default is
 * read as "never tuned" and replaced by the new default, so the riskier profile applies without a DB migration. custom-v1 (RONIN) has no params: its strategy is a spec
 * in the rule language (strategy/custom-v1.ts), checked by validateSpec against RONIN_LIMITS (max 10% per trade).
 */
import { runStrategy as runMomentum } from "./strategy/momentum-v1";
import { runDipStrategy } from "./strategy/dip-v1";
import { runSwingStrategy } from "./strategy/swing-v1";
import { runBreakoutStrategy } from "./strategy/breakout-v1";
import { RONIN_LIMITS, RONIN_SEED_SPEC, runCustomStrategy, specWarmup, validateSpec, type CustomSpec } from "./strategy/custom-v1";
import { runTrendStrategy } from "./strategy/trend-v1";
import { runMeanRevStrategy } from "./strategy/meanrev-v1";
import { runScalpStrategy } from "./strategy/scalp-v1";
import { runOptionsStrategy } from "./strategy/options-v1";
import { CYCLE_BASE_UNDERLYINGS, CYCLE_CANDIDATES, runCycleStraddle } from "./strategy/cycle-straddle-v1";
import { OPTION_UNDERLYINGS } from "./assets";
import { ROBOT_UNIVERSE, type Bar, type DeskId, type Position, type RecentEntry, type Signal, type StrategyId, type StrategyParams } from "./types";

export type StrategyInput = {
  params: StrategyParams;
  /** custom-v1 only: the team's strategy. */
  spec?: CustomSpec | null;
  universe: string[];
  bars: Map<string, Bar[]>;
  /** Closed 15-minute bars (scalp-v1). */
  bars15m?: Map<string, Bar[]>;
  positions: Position[];
  recentEntries: RecentEntry[];
  equity: number;
  now: number;
};

export type ParamBound = { min: number; max: number; label: string; kind?: "number" | "boolean" | "integer" };

export type StrategyDef = {
  id: StrategyId;
  desk: DeskId;
  label: string;
  summary: string;
  defaults: StrategyParams;
  bounds: Record<string, ParamBound>;
  /** Closed hourly bars needed before the strategy can produce an entry. */
  warmupBars: number;
  run(input: StrategyInput): Signal[];
};

const n = (p: StrategyParams, k: string) => Number(p[k]);
const b = (p: StrategyParams, k: string) => p[k] === true;

export const STRATEGIES: Record<StrategyId, StrategyDef> = {
  "momentum-v1": {
    id: "momentum-v1",
    desk: "samurai",
    label: "Momentum",
    summary: "Buys a coin or stock after a strong closed hour (1h return above the threshold); sells at the stop or the target.",
    defaults: { entryThresholdPct: 0.75, exitStopPct: -2.0, exitTakePct: 3.0, positionSizePct: 4.0, maxOpenPositions: 5, minEntryIntervalHours: 2 },
    bounds: {
      entryThresholdPct: { min: 0.25, max: 6, label: "Entry: 1h return above (%)" },
      exitStopPct: { min: -10, max: -0.5, label: "Stop loss (%)" },
      exitTakePct: { min: 0.5, max: 20, label: "Take profit (%)" },
      positionSizePct: { min: 0.5, max: 10, label: "Size (% of desk equity)" },
      maxOpenPositions: { min: 1, max: 6, label: "Max open positions", kind: "integer" },
      minEntryIntervalHours: { min: 1, max: 48, label: "Min hours between entries per coin", kind: "integer" },
    },
    warmupBars: 2,
    run: ({ params, universe, bars, positions, recentEntries, equity, now }) =>
      runMomentum(
        {
          universe,
          entryThresholdPct: n(params, "entryThresholdPct"),
          exitStopPct: n(params, "exitStopPct"),
          exitTakePct: n(params, "exitTakePct"),
          positionSizePct: n(params, "positionSizePct"),
          maxOpenPositions: n(params, "maxOpenPositions"),
          minEntryIntervalHours: n(params, "minEntryIntervalHours"),
          // Day-loss halts are enforced by the engine per desk and floor-wide, not inside the strategy.
          haltDayLossPct: Number.NEGATIVE_INFINITY,
        },
        bars,
        positions,
        recentEntries,
        equity,
        equity,
        now,
      ).signals,
  },
  "dip-v1": {
    id: "dip-v1",
    desk: "neon",
    label: "Buy the dip (Awad's)",
    summary: "Watches each coin; when it is down ≥4% in 24h or 5% under its 24h high, waits for the first green hour, then buys. Scales in once more if it drops another 4%. Sells at +4%, −8%, or after 72h in profit.",
    defaults: { dipThresholdPct: -2.5, dipFromHighPct: 0.97, takeProfitPct: 3.5, stopLossPct: -7.0, positionSizePct: 4.0, scaleInEnabled: true, scaleInDropPct: -3.0, maxTranches: 3, minEntryIntervalHours: 8, maxHoldHours: 72 },
    bounds: {
      dipThresholdPct: { min: -15, max: -1, label: "Dip: 24h return at or below (%)" },
      dipFromHighPct: { min: 0.8, max: 0.99, label: "Dip: price at or below × 24h high" },
      takeProfitPct: { min: 1, max: 20, label: "Take profit (%)" },
      stopLossPct: { min: -20, max: -1, label: "Hard stop (%)" },
      positionSizePct: { min: 0.5, max: 10, label: "Size per tranche (% of desk equity)" },
      scaleInEnabled: { min: 0, max: 1, label: "Scale-in on", kind: "boolean" },
      scaleInDropPct: { min: -15, max: -1, label: "Scale-in after a further drop of (%)" },
      maxTranches: { min: 1, max: 3, label: "Max tranches per coin", kind: "integer" },
      minEntryIntervalHours: { min: 1, max: 72, label: "Min hours between dip entries per coin", kind: "integer" },
      maxHoldHours: { min: 6, max: 240, label: "Time exit after (h, when in profit)", kind: "integer" },
    },
    warmupBars: 25,
    run: ({ params, universe, bars, positions, recentEntries, equity, now }) =>
      runDipStrategy(
        {
          universe,
          dipThresholdPct: n(params, "dipThresholdPct"),
          dipFromHighPct: n(params, "dipFromHighPct"),
          takeProfitPct: n(params, "takeProfitPct"),
          stopLossPct: n(params, "stopLossPct"),
          positionSizePct: n(params, "positionSizePct"),
          scaleInEnabled: b(params, "scaleInEnabled"),
          scaleInDropPct: n(params, "scaleInDropPct"),
          maxTranches: n(params, "maxTranches"),
          minEntryIntervalHours: n(params, "minEntryIntervalHours"),
          maxHoldHours: n(params, "maxHoldHours"),
        },
        bars,
        positions,
        recentEntries.map((e) => ({ ...e, strategy: "dip-v1" })),
        equity,
        now,
      ).signals,
  },
  "swing-v1": {
    id: "swing-v1",
    desk: "orbit",
    label: "Swing (EMA cross)",
    summary: "Rides swings: buys when the 9-hour EMA crosses above the 21-hour EMA (or crossed in the last 6h, or a green hour continues the uptrend), sells on the cross back down, −3% stop or +6% target.",
    defaults: { fastEma: 9, slowEma: 21, takeProfitPct: 6.0, stopLossPct: -3.0, positionSizePct: 4.0, maxOpenPositions: 5, minEntryIntervalHours: 6, crossLookbackBars: 6, trendEntry: true },
    bounds: {
      fastEma: { min: 5, max: 50, label: "Fast EMA (hours)", kind: "integer" },
      slowEma: { min: 20, max: 200, label: "Slow EMA (hours)", kind: "integer" },
      takeProfitPct: { min: 1, max: 30, label: "Take profit (%)" },
      stopLossPct: { min: -15, max: -0.5, label: "Stop loss (%)" },
      positionSizePct: { min: 0.5, max: 10, label: "Size (% of desk equity)" },
      maxOpenPositions: { min: 1, max: 6, label: "Max open positions", kind: "integer" },
      minEntryIntervalHours: { min: 1, max: 72, label: "Min hours between entries per coin", kind: "integer" },
      crossLookbackBars: { min: 1, max: 24, label: "Enter up to N hours after the cross", kind: "integer" },
      trendEntry: { min: 0, max: 1, label: "Trend-continuation entries on", kind: "boolean" },
    },
    warmupBars: 22,
    run: ({ params, universe, bars, positions, recentEntries, equity, now }) =>
      runSwingStrategy(
        {
          universe,
          fastEma: n(params, "fastEma"),
          slowEma: n(params, "slowEma"),
          takeProfitPct: n(params, "takeProfitPct"),
          stopLossPct: n(params, "stopLossPct"),
          positionSizePct: n(params, "positionSizePct"),
          maxOpenPositions: n(params, "maxOpenPositions"),
          minEntryIntervalHours: n(params, "minEntryIntervalHours"),
          crossLookbackBars: Number.isFinite(n(params, "crossLookbackBars")) ? n(params, "crossLookbackBars") : 1,
          trendEntry: b(params, "trendEntry"),
        },
        bars,
        positions,
        recentEntries,
        equity,
        now,
      ).signals,
  },
  "breakout-v1": {
    id: "breakout-v1",
    desk: "phantom",
    label: "Volume breakout",
    summary: "Event desk without a news feed: buys when an hour closes above the prior 12h high on at least 1.5× normal volume (coins 24/7, stocks incl. extended hours); quick +2.5% target, −1.5% stop, out within 24h.",
    defaults: { lookbackHours: 12, volumeMultiple: 1.5, takeProfitPct: 2.5, stopLossPct: -1.5, maxHoldHours: 24, positionSizePct: 4.0, maxOpenPositions: 5, minEntryIntervalHours: 3 },
    bounds: {
      lookbackHours: { min: 6, max: 72, label: "Breakout lookback (hours)", kind: "integer" },
      volumeMultiple: { min: 1.2, max: 5, label: "Volume vs average (×)" },
      takeProfitPct: { min: 0.5, max: 15, label: "Take profit (%)" },
      stopLossPct: { min: -10, max: -0.5, label: "Stop loss (%)" },
      maxHoldHours: { min: 2, max: 96, label: "Time exit after (h)", kind: "integer" },
      positionSizePct: { min: 0.5, max: 10, label: "Size (% of desk equity)" },
      maxOpenPositions: { min: 1, max: 6, label: "Max open positions", kind: "integer" },
      minEntryIntervalHours: { min: 1, max: 48, label: "Min hours between entries per coin", kind: "integer" },
    },
    warmupBars: 25,
    run: ({ params, universe, bars, positions, recentEntries, equity, now }) =>
      runBreakoutStrategy(
        {
          universe,
          lookbackHours: n(params, "lookbackHours"),
          volumeMultiple: n(params, "volumeMultiple"),
          takeProfitPct: n(params, "takeProfitPct"),
          stopLossPct: n(params, "stopLossPct"),
          maxHoldHours: n(params, "maxHoldHours"),
          positionSizePct: n(params, "positionSizePct"),
          maxOpenPositions: n(params, "maxOpenPositions"),
          minEntryIntervalHours: n(params, "minEntryIntervalHours"),
        },
        bars,
        positions,
        recentEntries,
        equity,
        now,
      ).signals,
  },
  "custom-v1": {
    id: "custom-v1",
    desk: "ronin",
    label: "Own strategies (RONIN)",
    summary: "RONIN writes its own strategies in the rule language (indicators, entry/exit rules, sizing), tests them, and adopts the ones that prove themselves. Higher risk: up to 10% per trade, 4 positions, 8 coins.",
    defaults: {},
    bounds: {},
    warmupBars: 2,
    run: ({ spec, bars, positions, recentEntries, equity, now }) => runCustomStrategy(spec ?? RONIN_SEED_SPEC, bars, positions, recentEntries, equity, now),
  },
  "trend-v1": {
    id: "trend-v1",
    desk: "samurai",
    label: "Trending movers",
    summary: "SAMURAI lane: momentum on new/trending coins and tickers. Ranks the wide list by 24h return and buys the top 3 that are up ≥3% with a green last hour on rising volume; −3% stop, +6% target, out within 24h.",
    defaults: { topN: 3, minRet24hPct: 3, minVolumeRatio: 1.1, stopLossPct: -3, takeProfitPct: 6, maxHoldHours: 24, positionSizePct: 4, maxOpenPositions: 4, minEntryIntervalHours: 6 },
    bounds: {
      topN: { min: 1, max: 6, label: "Top N movers", kind: "integer" },
      minRet24hPct: { min: 0.5, max: 25, label: "Min 24h return (%)" },
      minVolumeRatio: { min: 0.5, max: 5, label: "Min volume ratio (6h vs prior 24h)" },
      stopLossPct: { min: -15, max: -0.5, label: "Stop loss (%)" },
      takeProfitPct: { min: 0.5, max: 40, label: "Take profit (%)" },
      maxHoldHours: { min: 1, max: 120, label: "Time exit after (h)", kind: "integer" },
      positionSizePct: { min: 0.5, max: 10, label: "Size (% of desk equity)" },
      maxOpenPositions: { min: 1, max: 6, label: "Max open positions", kind: "integer" },
      minEntryIntervalHours: { min: 1, max: 48, label: "Min hours between entries per symbol", kind: "integer" },
    },
    warmupBars: 31,
    run: ({ params, universe, bars, positions, recentEntries, equity, now }) =>
      runTrendStrategy({ universe, topN: n(params, "topN"), minRet24hPct: n(params, "minRet24hPct"), minVolumeRatio: n(params, "minVolumeRatio"), stopLossPct: n(params, "stopLossPct"), takeProfitPct: n(params, "takeProfitPct"), maxHoldHours: n(params, "maxHoldHours"), positionSizePct: n(params, "positionSizePct"), maxOpenPositions: n(params, "maxOpenPositions"), minEntryIntervalHours: n(params, "minEntryIntervalHours") }, bars, positions, recentEntries, equity, now).signals,
  },
  "meanrev-v1": {
    id: "meanrev-v1",
    desk: "neon",
    label: "Mean reversion",
    summary: "NEON lane: buys oversold coins and stocks (RSI14 < 30 and below the lower Bollinger band); sells back at the 20-hour mean, +3% target, −4% stop, or after 48h.",
    defaults: { rsiBelow: 30, bandSigma: 2, stopLossPct: -4, takeProfitPct: 3, maxHoldHours: 48, positionSizePct: 4, maxOpenPositions: 4, minEntryIntervalHours: 6 },
    bounds: {
      rsiBelow: { min: 10, max: 45, label: "Entry: RSI14 below" },
      bandSigma: { min: 1, max: 3.5, label: "Lower band (σ)" },
      stopLossPct: { min: -15, max: -0.5, label: "Stop loss (%)" },
      takeProfitPct: { min: 0.5, max: 20, label: "Take profit (%)" },
      maxHoldHours: { min: 2, max: 168, label: "Time exit after (h)", kind: "integer" },
      positionSizePct: { min: 0.5, max: 10, label: "Size (% of desk equity)" },
      maxOpenPositions: { min: 1, max: 6, label: "Max open positions", kind: "integer" },
      minEntryIntervalHours: { min: 1, max: 72, label: "Min hours between entries per symbol", kind: "integer" },
    },
    warmupBars: 21,
    run: ({ params, universe, bars, positions, recentEntries, equity, now }) =>
      runMeanRevStrategy({ universe, rsiBelow: n(params, "rsiBelow"), bandSigma: n(params, "bandSigma"), stopLossPct: n(params, "stopLossPct"), takeProfitPct: n(params, "takeProfitPct"), maxHoldHours: n(params, "maxHoldHours"), positionSizePct: n(params, "positionSizePct"), maxOpenPositions: n(params, "maxOpenPositions"), minEntryIntervalHours: n(params, "minEntryIntervalHours") }, bars, positions, recentEntries, equity, now).signals,
  },
  "scalp-v1": {
    id: "scalp-v1",
    desk: "phantom",
    label: "15m scalper",
    summary: "PHANTOM lane: scalps coins on closed 15-minute bars (green bar ≥0.3% above EMA9 > EMA21 on 1.3× volume); +0.8% target, −0.5% stop, out within 2 hours. Runs 24/7.",
    defaults: { minBarReturnPct: 0.3, minVolumeRatio: 1.3, takeProfitPct: 0.8, stopLossPct: -0.5, maxHoldMinutes: 120, positionSizePct: 3, maxOpenPositions: 3, minEntryIntervalHours: 1 },
    bounds: {
      minBarReturnPct: { min: 0.05, max: 3, label: "Entry: 15m bar return ≥ (%)" },
      minVolumeRatio: { min: 0.5, max: 5, label: "Volume vs previous 16 bars (×)" },
      takeProfitPct: { min: 0.2, max: 5, label: "Take profit (%)" },
      stopLossPct: { min: -5, max: -0.2, label: "Stop loss (%)" },
      maxHoldMinutes: { min: 15, max: 720, label: "Time exit after (min)", kind: "integer" },
      positionSizePct: { min: 0.5, max: 10, label: "Size (% of desk equity)" },
      maxOpenPositions: { min: 1, max: 6, label: "Max open positions", kind: "integer" },
      minEntryIntervalHours: { min: 1, max: 24, label: "Min hours between entries per coin", kind: "integer" },
    },
    warmupBars: 2,
    run: ({ params, universe, bars15m, positions, recentEntries, equity, now }) =>
      runScalpStrategy({ universe, minBarReturnPct: n(params, "minBarReturnPct"), minVolumeRatio: n(params, "minVolumeRatio"), takeProfitPct: n(params, "takeProfitPct"), stopLossPct: n(params, "stopLossPct"), maxHoldMinutes: n(params, "maxHoldMinutes"), positionSizePct: n(params, "positionSizePct"), maxOpenPositions: n(params, "maxOpenPositions"), minEntryIntervalHours: n(params, "minEntryIntervalHours") }, bars15m ?? new Map(), positions, recentEntries, equity, now).signals,
  },
  "options-v1": {
    id: "options-v1",
    desk: "orbit",
    label: "Defined-risk options",
    summary: "ORBIT lane: long calls on an hourly EMA9/21 up-cross, long puts on a down-cross (SPY, QQQ, NVDA, TSLA, AAPL), 7–30 DTE near the money, regular hours only. Max loss per position = premium paid, capped (default $250). No naked shorts.",
    defaults: { fastEma: 9, slowEma: 21, crossLookbackBars: 3, premiumStopPct: -50, premiumTakePct: 80, maxHoldHours: 72, minDteExit: 2, maxOpenPositions: 3, minEntryIntervalHours: 6 },
    bounds: {
      fastEma: { min: 3, max: 30, label: "Fast EMA (hours)", kind: "integer" },
      slowEma: { min: 10, max: 100, label: "Slow EMA (hours)", kind: "integer" },
      crossLookbackBars: { min: 1, max: 12, label: "Enter up to N hours after the cross", kind: "integer" },
      premiumStopPct: { min: -90, max: -10, label: "Premium stop (%)" },
      premiumTakePct: { min: 10, max: 400, label: "Premium target (%)" },
      maxHoldHours: { min: 1, max: 240, label: "Time exit after (h)", kind: "integer" },
      minDteExit: { min: 0, max: 10, label: "Exit at ≤ N days to expiry" },
      maxOpenPositions: { min: 1, max: 5, label: "Max open option positions", kind: "integer" },
      minEntryIntervalHours: { min: 1, max: 72, label: "Min hours between entries per underlying", kind: "integer" },
    },
    warmupBars: 23,
    run: ({ params, universe, bars, positions, recentEntries, now }) =>
      runOptionsStrategy({ underlyings: universe, fastEma: n(params, "fastEma"), slowEma: n(params, "slowEma"), crossLookbackBars: n(params, "crossLookbackBars"), premiumStopPct: n(params, "premiumStopPct"), premiumTakePct: n(params, "premiumTakePct"), maxHoldHours: n(params, "maxHoldHours"), minDteExit: n(params, "minDteExit"), maxOpenPositions: n(params, "maxOpenPositions"), minEntryIntervalHours: n(params, "minEntryIntervalHours") }, bars, positions, recentEntries, now).signals,
  },
  "cycle-straddle-v1": {
    id: "cycle-straddle-v1",
    desk: "cycle",
    label: "Cycle straddle",
    summary: "CYCLE (Awad's idea: prices move in a ~3-week cycle): every Monday in the regular session, one long ATM straddle (call + put, same strike, ~4 weeks out) on SPY, QQQ and stocks whose 1-year daily bars show a real ~15-trading-day cycle. Each leg sells on its own at +50%; the rest goes at −50% combined or on trading day 15. Max $500 debit per straddle, 4 open. Long premium only.",
    defaults: { legTakePct: 50, comboStopPct: -50, timeExitDay: 15, maxOpenStraddles: 4 },
    // Bounds only let the lab/agents make it SAFER than Awad's spec (smaller, earlier, tighter), never riskier.
    bounds: {
      legTakePct: { min: 20, max: 150, label: "Sell a leg at premium + (%)" },
      comboStopPct: { min: -50, max: -20, label: "Close the straddle at combined (%)" },
      timeExitDay: { min: 5, max: 15, label: "Time exit on trading day", kind: "integer" },
      maxOpenStraddles: { min: 1, max: 4, label: "Max open straddles", kind: "integer" },
    },
    warmupBars: 0,
    run: ({ params, universe, positions, recentEntries, now }) =>
      runCycleStraddle({ underlyings: universe, legTakePct: n(params, "legTakePct"), comboStopPct: n(params, "comboStopPct"), timeExitDay: n(params, "timeExitDay"), maxOpenStraddles: n(params, "maxOpenStraddles") }, positions, recentEntries, now).signals,
  },
};

/** Pre-2026-10-02 defaults. A stored value still equal to one of these is treated as untuned (→ new default). */
export const LEGACY_DEFAULTS: Partial<Record<StrategyId, StrategyParams>> = {
  "momentum-v1": { entryThresholdPct: 2.0, exitStopPct: -1.5, exitTakePct: 3.0, positionSizePct: 2.0, maxOpenPositions: 3, minEntryIntervalHours: 4 },
  "dip-v1": { dipThresholdPct: -4.0, dipFromHighPct: 0.95, takeProfitPct: 4.0, stopLossPct: -8.0, positionSizePct: 2.0, scaleInEnabled: true, scaleInDropPct: -4.0, maxTranches: 2, minEntryIntervalHours: 24, maxHoldHours: 72 },
  "swing-v1": { fastEma: 20, slowEma: 50, takeProfitPct: 6.0, stopLossPct: -3.0, positionSizePct: 2.0, maxOpenPositions: 3, minEntryIntervalHours: 12 },
  "breakout-v1": { lookbackHours: 24, volumeMultiple: 2.0, takeProfitPct: 2.5, stopLossPct: -1.5, maxHoldHours: 24, positionSizePct: 2.0, maxOpenPositions: 3, minEntryIntervalHours: 6 },
};

/** Underlyings for options-v1. */
export const OPTIONS_UNIVERSE: string[] = [...OPTION_UNDERLYINGS];

export function isStrategyId(id: unknown): id is StrategyId {
  return typeof id === "string" && id in STRATEGIES;
}

export const DEFAULT_UNIVERSE: string[] = [...ROBOT_UNIVERSE];

/** The spec a custom-v1 desk/test trades: the stored one when valid, otherwise RONIN's seed. null for core strategies. */
export function resolveSpec(strategy: StrategyId, stored: unknown): CustomSpec | null {
  if (strategy !== "custom-v1") return null;
  const v = validateSpec(stored, RONIN_LIMITS);
  return v.ok ? v.spec : RONIN_SEED_SPEC;
}

/** Underlyings CYCLE screens (SPY/QQQ always traded; the rest only when the cycle detector qualifies them). */
export const CYCLE_SCREEN: string[] = [...CYCLE_BASE_UNDERLYINGS, ...CYCLE_CANDIDATES];

/** Symbols a strategy trades (coins; CYCLE: the option underlyings it screens). */
export function strategyUniverse(strategy: StrategyId, spec: CustomSpec | null): string[] {
  if (strategy === "cycle-straddle-v1") return CYCLE_SCREEN;
  return strategy === "custom-v1" ? (spec ?? RONIN_SEED_SPEC).universe : DEFAULT_UNIVERSE;
}

/** Hourly bars needed before the strategy can decide. */
export function strategyWarmup(strategy: StrategyId, spec: CustomSpec | null): number {
  return strategy === "custom-v1" ? specWarmup(spec ?? RONIN_SEED_SPEC) : STRATEGIES[strategy].warmupBars;
}

/** Every coin any desk or running test trades (what the tick fetches). Core coins first. */
export function floorUniverse(items: Array<{ strategy: StrategyId; spec?: unknown }>): string[] {
  const out = new Set<string>(DEFAULT_UNIVERSE);
  for (const it of items) {
    if (it.strategy === "cycle-straddle-v1") continue; // stock underlyings, fetched with the stocks (tick.ts)
    for (const s of strategyUniverse(it.strategy, resolveSpec(it.strategy, it.spec))) out.add(s);
  }
  return [...out];
}

/** One-line description of what a desk trades right now. */
export function strategySummary(strategy: StrategyId, spec: CustomSpec | null): string {
  if (strategy === "custom-v1" && spec) return `"${spec.name}": ${spec.thesis}`;
  return STRATEGIES[strategy].summary;
}

/**
 * Merge `overrides` onto `base` (defaults when absent) and check every value against the strategy bounds.
 * Unknown keys and out-of-range values are errors; nothing is clamped silently.
 */
export function validateParams(
  strategy: StrategyId,
  overrides: Record<string, unknown>,
  base?: StrategyParams,
): { ok: true; params: StrategyParams } | { ok: false; errors: string[] } {
  const def = STRATEGIES[strategy];
  const params: StrategyParams = { ...def.defaults, ...(base ?? {}) };
  const errors: string[] = [];
  for (const [key, raw] of Object.entries(overrides ?? {})) {
    const bound = def.bounds[key];
    if (!bound) {
      errors.push(`${key} is not a ${strategy} parameter. Allowed: ${Object.keys(def.bounds).join(", ")}`);
      continue;
    }
    if (bound.kind === "boolean") {
      if (typeof raw !== "boolean") errors.push(`${key} must be true or false`);
      else params[key] = raw;
      continue;
    }
    const value = typeof raw === "string" ? Number(raw) : raw;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`${key} must be a number`);
      continue;
    }
    if (bound.kind === "integer" && !Number.isInteger(value)) {
      errors.push(`${key} must be a whole number`);
      continue;
    }
    if (value < bound.min || value > bound.max) {
      errors.push(`${key}=${value} is outside the allowed range ${bound.min}…${bound.max}`);
      continue;
    }
    params[key] = value;
  }
  if (strategy === "swing-v1" && Number(params.fastEma) >= Number(params.slowEma)) {
    errors.push("fastEma must be smaller than slowEma");
  }
  return errors.length ? { ok: false, errors } : { ok: true, params };
}

/** Desk params from the DB merged over defaults (missing keys → defaults). */
export function effectiveParams(strategy: StrategyId, stored: unknown): StrategyParams {
  const base = { ...STRATEGIES[strategy].defaults };
  const legacy = LEGACY_DEFAULTS[strategy] ?? {};
  const bounds = STRATEGIES[strategy].bounds;
  if (stored && typeof stored === "object") {
    for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
      if (!(k in base) || !(typeof v === "number" || typeof v === "boolean")) continue; // unknown keys (incl. any loss-cap key) are ignored
      if (k in legacy && legacy[k] === v) continue; // untouched pre-2026-10-02 default → riskier default
      const bd = bounds[k];
      if (typeof v === "number" && bd && bd.kind !== "boolean" && (v < bd.min || v > bd.max)) continue; // out of bounds → default
      base[k] = v;
    }
  }
  if (strategy === "swing-v1" && Number(base.fastEma) >= Number(base.slowEma)) {
    base.fastEma = STRATEGIES[strategy].defaults.fastEma;
    base.slowEma = STRATEGIES[strategy].defaults.slowEma;
  }
  return base;
}
