import { describe, expect, it } from "vitest";
import { backtestLine, runBacktest } from "./backtest";
import { STRATEGIES } from "./strategies";
import type { CustomSpec } from "./strategy/custom-v1";
import type { Bar } from "./types";

const H = 3_600_000;
const t0 = Date.UTC(2026, 8, 1);
const series = (symbol: string, closes: number[]): Bar[] =>
  closes.map((c, i) => ({ symbol, timestamp: new Date(t0 + i * H).toISOString(), open: i ? closes[i - 1] : c, high: Math.max(c, i ? closes[i - 1] : c), low: Math.min(c, i ? closes[i - 1] : c), close: c, volume: 10 }));

describe("runBacktest", () => {
  it("replays momentum: buys a +3% hour and takes profit at +3%", () => {
    const closes = [...Array.from({ length: 10 }, () => 100), 103, 104, 105, 106.5, 107, 107];
    const r = runBacktest({
      strategy: "momentum-v1",
      params: STRATEGIES["momentum-v1"].defaults,
      bars: new Map([["BTC/USD", series("BTC/USD", closes)]]),
      universe: ["BTC/USD"],
      capital: 25_000,
      slippageBps: 0,
    });
    expect(r.trades).toBe(1);
    expect(r.recentTrades[0].entryPrice).toBe(103);
    expect(r.recentTrades[0].exitPrice).toBe(106.5);
    expect(r.returnPct).toBeGreaterThan(0);
    expect(r.benchmark["BTC/USD"]).toBeCloseTo(7);
    expect(backtestLine(r)).toMatch(/momentum-v1 over 1d: \+0\.\d+% return, 1 trades, win 100%/);
  });

  it("buy-the-dip waits for the first green hour after a 24h drop", () => {
    const down = Array.from({ length: 30 }, (_, i) => 100 - i * 0.3); // ~−8.7% slide, all red
    const closes = [...down, down[29] + 0.5, down[29] + 1, 97];
    const r = runBacktest({
      strategy: "dip-v1",
      params: STRATEGIES["dip-v1"].defaults,
      bars: new Map([["ETH/USD", series("ETH/USD", closes)]]),
      universe: ["ETH/USD"],
      capital: 25_000,
      slippageBps: 0,
    });
    expect(r.trades + r.openAtEnd).toBeGreaterThan(0);
    expect(r.maxDrawdownPct).toBeGreaterThanOrEqual(0);
  });
});

describe("runBacktest with a RONIN strategy spec", () => {
  it("trades the spec's coins with a trailing stop", () => {
    const spec: CustomSpec = {
      name: "Two green hours",
      thesis: "test",
      universe: ["DOGE/USD"],
      entry: { all: [{ ind: { kind: "greenStreak" }, op: ">=", value: 2 }] },
      exit: { takeProfitPct: 20, stopLossPct: -5, trailingStopPct: 2 },
      sizing: { positionSizePct: 10, maxOpenPositions: 1, minEntryIntervalHours: 0 },
    };
    const closes = [1, 1, 1, 1.01, 1.02, 1.05, 1.08, 1.05, 1.04, 1.04];
    const r = runBacktest({ strategy: "custom-v1", params: {}, spec, bars: new Map([["DOGE/USD", series("DOGE/USD", closes)]]), universe: ["DOGE/USD"], capital: 10_000, slippageBps: 0 });
    expect(r.trades).toBeGreaterThanOrEqual(1);
    expect(r.recentTrades[0].entryPrice).toBe(1.02);
    expect(r.recentTrades[0].exitReason).toMatch(/Trailing stop/);
    expect(backtestLine(r)).toMatch(/^"Two green hours" over/);
  });
});

