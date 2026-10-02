import { describe, expect, it } from "vitest";
import { RONIN_LIMITS, RONIN_SEED_SPEC, evalIndicator, runCustomStrategy, specWarmup, validateSpec, type CustomSpec } from "./custom-v1";
import type { Bar, Position } from "../types";

const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 2, 12, 5);

function series(symbol: string, closes: number[], volumes?: number[]): Bar[] {
  const start = NOW - 5 * 60_000 - closes.length * H;
  return closes.map((c, i) => ({
    symbol,
    timestamp: new Date(start + i * H).toISOString(),
    open: i ? closes[i - 1] : c,
    high: Math.max(c, i ? closes[i - 1] : c),
    low: Math.min(c, i ? closes[i - 1] : c),
    close: c,
    volume: volumes?.[i] ?? 10,
  }));
}

const flat = (n: number, v = 100) => Array.from({ length: n }, () => v);

const spec = (over: Partial<CustomSpec> = {}): CustomSpec => ({
  name: "Test",
  thesis: "Test thesis",
  universe: ["BTC/USD", "XRP/USD"],
  entry: { all: [{ ind: { kind: "return", hours: 3 }, op: ">", value: 1.5 }] },
  exit: { takeProfitPct: 6, stopLossPct: -4 },
  sizing: { positionSizePct: 8, maxOpenPositions: 2, minEntryIntervalHours: 6 },
  ...over,
});

describe("validateSpec", () => {
  it("accepts the seed and normalizes coins", () => {
    const v = validateSpec({ ...RONIN_SEED_SPEC, universe: ["btc/usd", "XRP/USD", "BTC/USD"] });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.spec.universe).toEqual(["BTC/USD", "XRP/USD"]);
  });

  it("rejects everything outside the team's limits — nothing is clamped", () => {
    const v = validateSpec({
      ...RONIN_SEED_SPEC,
      universe: ["BTC/USD", "PEPE/USD"],
      exit: { takeProfitPct: 6, stopLossPct: -40 },
      sizing: { positionSizePct: 25, maxOpenPositions: 9, minEntryIntervalHours: 1 },
    });
    expect(v.ok).toBe(false);
    if (!v.ok) {
      const all = v.errors.join(" | ");
      expect(all).toMatch(/PEPE\/USD/);
      expect(all).toMatch(/stopLossPct/);
      expect(all).toMatch(/positionSizePct must be 0.5–10/);
      expect(all).toMatch(/maxOpenPositions must be 1–4/);
    }
  });

  it("requires a stop, a thesis, valid indicators and at least one entry rule", () => {
    const v = validateSpec({
      name: "x",
      thesis: "",
      universe: ["BTC/USD"],
      entry: { all: [{ ind: { kind: "magic", hours: 2 }, op: ">", value: 1 }, { ind: { kind: "emaGap", fast: 50, slow: 20 }, op: "=", value: 0 }] },
      exit: { takeProfitPct: 3 },
      sizing: { positionSizePct: 5, maxOpenPositions: 2, minEntryIntervalHours: 2 },
    });
    expect(v.ok).toBe(false);
    if (!v.ok) {
      const all = v.errors.join(" | ");
      expect(all).toMatch(/thesis is required/);
      expect(all).toMatch(/kind must be one of/);
      expect(all).toMatch(/fast < slow/);
      expect(all).toMatch(/op must be/);
      expect(all).toMatch(/stopLossPct/);
    }
    expect(validateSpec({ ...RONIN_SEED_SPEC, entry: { all: [] } }).ok).toBe(false);
  });

  it("caps the number of conditions", () => {
    const many = Array.from({ length: RONIN_LIMITS.maxConditions + 1 }, () => ({ ind: { kind: "greenStreak" }, op: ">", value: 0 }));
    expect(validateSpec({ ...RONIN_SEED_SPEC, entry: { all: many } }).ok).toBe(false);
  });
});

describe("indicators", () => {
  const bars = series("BTC/USD", [100, 100, 100, 101, 102, 104], [10, 10, 10, 10, 10, 40]);
  it("return, distance from high/low, volume ratio, green streak", () => {
    expect(evalIndicator({ kind: "return", hours: 3 }, bars)).toBeCloseTo(4);
    expect(evalIndicator({ kind: "distFromHigh", hours: 6 }, bars)).toBeCloseTo(0);
    expect(evalIndicator({ kind: "distFromLow", hours: 6 }, bars)).toBeCloseTo(4);
    expect(evalIndicator({ kind: "volumeRatio", hours: 5 }, bars)).toBeCloseTo(4);
    expect(evalIndicator({ kind: "greenStreak" }, bars)).toBe(3);
    expect(evalIndicator({ kind: "return", hours: 10 }, bars)).toBeNull();
  });
  it("rsi is 100 in a straight rise and ~0 in a straight fall", () => {
    const up = series("BTC/USD", Array.from({ length: 30 }, (_, i) => 100 + i));
    const down = series("BTC/USD", Array.from({ length: 30 }, (_, i) => 200 - i));
    expect(evalIndicator({ kind: "rsi", period: 14 }, up)).toBe(100);
    expect(evalIndicator({ kind: "rsi", period: 14 }, down)!).toBeLessThan(1);
  });
  it("emaGap is positive in an uptrend; volatility is 0 on a flat line", () => {
    const up = series("BTC/USD", Array.from({ length: 80 }, (_, i) => 100 + i));
    expect(evalIndicator({ kind: "emaGap", fast: 5, slow: 20 }, up)!).toBeGreaterThan(0);
    expect(evalIndicator({ kind: "volatility", hours: 10 }, series("BTC/USD", flat(20)))).toBe(0);
  });
  it("warm-up covers the longest lookback", () => {
    expect(specWarmup(RONIN_SEED_SPEC)).toBe(25);
  });
});

describe("runCustomStrategy", () => {
  const bars = new Map([
    ["BTC/USD", series("BTC/USD", [...flat(20), 100, 101, 103])],
    ["XRP/USD", series("XRP/USD", flat(23, 2))],
  ]);

  it("enters coins whose rules all pass, sized by % of equity", () => {
    const sig = runCustomStrategy(spec(), bars, [], [], 10_000, NOW);
    expect(sig).toHaveLength(1);
    expect(sig[0]).toMatchObject({ type: "entry", symbol: "BTC/USD", side: "buy" });
    expect(sig[0].qty! * 103).toBeCloseTo(800);
  });

  it("respects 'any' rules, max positions and the entry interval", () => {
    const withAny = spec({ entry: { all: [{ ind: { kind: "return", hours: 3 }, op: ">", value: 1.5 }], any: [{ ind: { kind: "rsi", period: 14 }, op: "<", value: 10 }] } });
    expect(runCustomStrategy(withAny, bars, [], [], 10_000, NOW)).toHaveLength(0);
    const recent = [{ symbol: "BTC/USD", timestamp: new Date(NOW - 2 * H).toISOString(), strategy: "custom-v1" }];
    expect(runCustomStrategy(spec(), bars, [], recent, 10_000, NOW)).toHaveLength(0);
    const full: Position[] = [
      { symbol: "ETH/USD", qty: 1, avgEntryPrice: 1, currentPrice: 1, unrealizedPnl: 0, unrealizedPnlPct: 0 },
      { symbol: "SOL/USD", qty: 1, avgEntryPrice: 1, currentPrice: 1, unrealizedPnl: 0, unrealizedPnlPct: 0 },
    ];
    expect(runCustomStrategy(spec(), bars, full, [], 10_000, NOW).filter((s) => s.side === "buy")).toHaveLength(0);
  });

  it("exits on stop, target, trailing stop, time and exit rules", () => {
    const pos = (over: Partial<Position>): Position => ({ symbol: "BTC/USD", qty: 1, avgEntryPrice: 100, currentPrice: 100, unrealizedPnl: 0, unrealizedPnlPct: 0, enteredAt: new Date(NOW - 5 * H).toISOString(), ...over });
    const s = spec({ exit: { takeProfitPct: 6, stopLossPct: -4, trailingStopPct: 1.5, maxHoldHours: 48, exitWhen: [{ ind: { kind: "return", hours: 1 }, op: "<", value: -5 }] } });
    expect(runCustomStrategy(s, bars, [pos({ currentPrice: 95, unrealizedPnlPct: -5 })], [], 10_000, NOW)[0].reason).toMatch(/Stop loss/);
    expect(runCustomStrategy(s, bars, [pos({ currentPrice: 107, unrealizedPnlPct: 7 })], [], 10_000, NOW)[0].reason).toMatch(/Take profit/);
    // Best close since entry was 103; now 101.4 → −1.55% from the peak.
    expect(runCustomStrategy(s, bars, [pos({ currentPrice: 101.4, unrealizedPnlPct: 1.4 })], [], 10_000, NOW)[0].reason).toMatch(/Trailing stop/);
    expect(runCustomStrategy(s, bars, [pos({ currentPrice: 102.5, unrealizedPnlPct: 2.5, enteredAt: new Date(NOW - 50 * H).toISOString() })], [], 10_000, NOW)[0].reason).toMatch(/Time exit/);
    const crash = new Map([["BTC/USD", series("BTC/USD", [...flat(20), 100, 100, 94])]]);
    expect(runCustomStrategy(s, crash, [pos({ currentPrice: 98, unrealizedPnlPct: -2, enteredAt: undefined })], [], 10_000, NOW)[0].reason).toMatch(/Exit rule/);
  });

  it("manages coins dropped from the strategy with the stop and target only", () => {
    const legacy: Position = { symbol: "DOGE/USD", qty: 100, avgEntryPrice: 0.2, currentPrice: 0.19, unrealizedPnl: -1, unrealizedPnlPct: -5 };
    const out = runCustomStrategy(spec(), bars, [legacy], [], 10_000, NOW);
    expect(out.find((x) => x.symbol === "DOGE/USD")?.reason).toMatch(/Legacy position exit/);
  });
});
