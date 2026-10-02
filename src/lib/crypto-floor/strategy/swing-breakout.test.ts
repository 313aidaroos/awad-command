import { describe, expect, it } from "vitest";
import { defaultSwingConfig, emaCross, runSwingStrategy } from "./swing-v1";
import { breakoutRead, defaultBreakoutConfig, runBreakoutStrategy } from "./breakout-v1";
import type { Bar, Position } from "../types";

const H = 3_600_000;
const t0 = Date.UTC(2026, 8, 20, 0);
const mk = (closes: number[], volumes?: number[]): Bar[] =>
  closes.map((c, i) => ({
    symbol: "BTC/USD",
    timestamp: new Date(t0 + i * H).toISOString(),
    open: c,
    high: c,
    low: c,
    close: c,
    volume: volumes?.[i] ?? 10,
  }));

describe("swing-v1", () => {
  // 60 falling hours, then a sharp rally: EMA20 crosses above EMA50 at some point; find that bar.
  const closes = [...Array.from({ length: 60 }, (_, i) => 200 - i), ...Array.from({ length: 40 }, (_, i) => 141 + i * 3)];
  const crossAt = (() => {
    for (let n = 52; n <= closes.length; n++) if (emaCross(mk(closes.slice(0, n)), 20, 50).cross === "up") return n;
    return -1;
  })();

  it("detects the cross up exactly once", () => {
    expect(crossAt).toBeGreaterThan(0);
    expect(emaCross(mk(closes.slice(0, crossAt + 1)), 20, 50).cross).toBeNull();
  });

  it("enters on the cross and respects the entry interval", () => {
    const bars = new Map([["BTC/USD", mk(closes.slice(0, crossAt))]]);
    const cfg = { ...defaultSwingConfig, universe: ["BTC/USD"] };
    const now = t0 + crossAt * H;
    const r = runSwingStrategy(cfg, bars, [], [], 25_000, now);
    expect(r.signals).toHaveLength(1);
    expect(r.signals[0].side).toBe("buy");
    expect(r.signals[0].qty).toBeCloseTo(500 / closes[crossAt - 1]);
    const again = runSwingStrategy(cfg, bars, [], [{ symbol: "BTC/USD", timestamp: new Date(now - H).toISOString(), strategy: "swing-v1" }], 25_000, now);
    expect(again.signals).toHaveLength(0);
  });

  it("exits on stop, target, or cross down", () => {
    const pos = (pct: number): Position => ({ symbol: "BTC/USD", qty: 1, avgEntryPrice: 100, currentPrice: 100 + pct, unrealizedPnl: pct, unrealizedPnlPct: pct });
    const bars = new Map([["BTC/USD", mk(Array.from({ length: 60 }, () => 100))]]);
    const cfg = { ...defaultSwingConfig, universe: ["BTC/USD"] };
    expect(runSwingStrategy(cfg, bars, [pos(-3.5)], [], 25_000).signals[0].reason).toMatch(/Stop/);
    expect(runSwingStrategy(cfg, bars, [pos(7)], [], 25_000).signals[0].reason).toMatch(/Take/);
    const down = [...Array.from({ length: 60 }, (_, i) => 100 + i), ...Array.from({ length: 30 }, (_, i) => 159 - i * 4)];
    let found = false;
    for (let n = 60; n <= down.length && !found; n++) {
      const sig = runSwingStrategy(cfg, new Map([["BTC/USD", mk(down.slice(0, n))]]), [pos(0)], [], 25_000).signals;
      if (sig.some((s) => /Trend exit/.test(s.reason))) found = true;
    }
    expect(found).toBe(true);
  });
});

describe("breakout-v1", () => {
  const base = Array.from({ length: 24 }, () => 100);
  it("needs a close above the prior high on heavy volume", () => {
    const quiet = mk([...base, 105], [...base.map(() => 10), 15]);
    expect(breakoutRead(quiet, 24)!.volumeRatio).toBeCloseTo(1.5);
    const cfg = { ...defaultBreakoutConfig, universe: ["BTC/USD"] };
    expect(runBreakoutStrategy(cfg, new Map([["BTC/USD", quiet]]), [], [], 25_000).signals).toHaveLength(0);
    const loud = mk([...base, 105], [...base.map(() => 10), 30]);
    const r = runBreakoutStrategy(cfg, new Map([["BTC/USD", loud]]), [], [], 25_000);
    expect(r.signals).toHaveLength(1);
    expect(r.signals[0].reason).toMatch(/Breakout/);
  });

  it("time-exits after maxHoldHours regardless of P&L", () => {
    const now = t0 + 100 * H;
    const p: Position = { symbol: "BTC/USD", qty: 1, avgEntryPrice: 100, currentPrice: 100.5, unrealizedPnl: 0.5, unrealizedPnlPct: 0.5, enteredAt: new Date(now - 25 * H).toISOString() };
    const cfg = { ...defaultBreakoutConfig, universe: ["BTC/USD"] };
    const r = runBreakoutStrategy(cfg, new Map(), [p], [], 25_000, now);
    expect(r.signals[0].reason).toMatch(/Time exit/);
  });
});
