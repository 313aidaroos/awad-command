import { describe, expect, it } from "vitest";
import { closedBars, ema, nextUtcMidnight, normalizePair, watchLine, watchStat } from "./market";
import type { Bar } from "./types";

const H = 3_600_000;
const bar = (t: number, close: number, extra: Partial<Bar> = {}): Bar => ({
  symbol: "BTC/USD",
  timestamp: new Date(t).toISOString(),
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
  ...extra,
});

describe("market", () => {
  it("drops the in-progress hour and sorts oldest first", () => {
    const now = Date.UTC(2026, 9, 2, 12, 30);
    const bars = [bar(Date.UTC(2026, 9, 2, 12), 3), bar(Date.UTC(2026, 9, 2, 10), 1), bar(Date.UTC(2026, 9, 2, 11), 2)];
    const out = closedBars(bars, now);
    expect(out.map((b) => b.close)).toEqual([1, 2]);
  });

  it("computes 1h/24h returns and distance from the 24h high", () => {
    const t0 = Date.UTC(2026, 9, 1, 0);
    const bars = Array.from({ length: 26 }, (_, i) => bar(t0 + i * H, 100, { high: i === 10 ? 120 : 100 }));
    bars[25] = bar(t0 + 25 * H, 90, { open: 88, high: 91 });
    const s = watchStat("BTC/USD", bars);
    expect(s.ret1h).toBeCloseTo(-10);
    expect(s.ret24h).toBeCloseTo(-10);
    expect(s.high24h).toBe(120);
    expect(s.distFromHighPct).toBeCloseTo(-25);
    expect(s.lastHourGreen).toBe(true);
    expect(watchLine([s])).toBe("BTC -10.0% (24h) ✓ dip zone");
  });

  it("uses the live trade price for the current price when given", () => {
    const t0 = Date.UTC(2026, 9, 1, 0);
    const bars = Array.from({ length: 25 }, (_, i) => bar(t0 + i * H, 100));
    expect(watchStat("BTC/USD", bars, { price: 105, at: "x" }).ret24h).toBeCloseTo(5);
  });

  it("ema seeds with the simple average", () => {
    const e = ema([1, 2, 3, 4, 5], 3);
    expect(Number.isNaN(e[1])).toBe(true);
    expect(e[2]).toBe(2);
    expect(e[3]).toBe(3);
  });

  it("normalizes pairs and finds next UTC midnight", () => {
    expect(normalizePair("BTCUSD")).toBe("BTC/USD");
    expect(normalizePair("eth/usd")).toBe("ETH/USD");
    expect(nextUtcMidnight(Date.UTC(2026, 9, 2, 23, 59)).toISOString()).toBe("2026-10-03T00:00:00.000Z");
  });
});

describe("roundQty (Alpaca increments)", () => {
  it("rounds down to the pair's increment", async () => {
    const { roundQty } = await import("./alpaca");
    expect(roundQty(111_111_111.7, 1)).toBe(111_111_111);
    expect(roundQty(5263.157, 0.01)).toBe(5263.15);
    expect(roundQty(0.123456789, 0)).toBe(0.123456789);
  });
});
