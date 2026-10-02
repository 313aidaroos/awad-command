import { describe, it, expect } from "vitest";
import {
  calculate1hReturn,
  calculate24hReturn,
  calculate24hHigh,
  isLastCandleGreen,
  hasRecentDipEntry,
  hoursHeld,
  runDipStrategy,
  defaultDipConfig,
  type Bar,
  type Position,
  type RecentEntry,
} from "./dip-v1";

describe("dip-v1 strategy", () => {
  describe("calculate24hReturn", () => {
    it("returns null for insufficient bars", () => {
      expect(calculate24hReturn([])).toBeNull();
      expect(calculate24hReturn(new Array(24).fill({ close: 100 } as Bar))).toBeNull();
    });

    it("calculates negative return (dip)", () => {
      const bars: Bar[] = new Array(25).fill(null).map((_, i) => ({
        close: i === 0 ? 67000 : 64000, // -4.48%
      } as Bar));
      expect(calculate24hReturn(bars)).toBeCloseTo(-4.48, 1);
    });

    it("calculates positive return", () => {
      const bars: Bar[] = new Array(25).fill(null).map((_, i) => ({
        close: i === 0 ? 67000 : 70000, // +4.48%
      } as Bar));
      expect(calculate24hReturn(bars)).toBeCloseTo(4.48, 1);
    });
  });

  describe("calculate24hHigh", () => {
    it("returns null for insufficient bars", () => {
      expect(calculate24hHigh([])).toBeNull();
    });

    it("finds 24h high", () => {
      const bars: Bar[] = new Array(25).fill(null).map((_, i) => ({
        high: i === 12 ? 70000 : 67000,
      } as Bar));
      expect(calculate24hHigh(bars)).toBe(70000);
    });
  });

  describe("isLastCandleGreen", () => {
    it("returns false for empty bars", () => {
      expect(isLastCandleGreen([])).toBe(false);
    });

    it("returns true when close > open", () => {
      const bars: Bar[] = [{ open: 67000, close: 67500 } as Bar];
      expect(isLastCandleGreen(bars)).toBe(true);
    });

    it("returns false when close ≤ open", () => {
      const bars: Bar[] = [{ open: 67000, close: 66500 } as Bar];
      expect(isLastCandleGreen(bars)).toBe(false);
    });
  });

  describe("hasRecentDipEntry", () => {
    it("returns false for no recent entries", () => {
      expect(hasRecentDipEntry("BTC/USD", [], 24)).toBe(false);
    });

    it("returns true for dip-v1 entry within 24h", () => {
      const recent: RecentEntry[] = [
        {
          symbol: "BTC/USD",
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12h ago
          strategy: "dip-v1",
        },
      ];
      expect(hasRecentDipEntry("BTC/USD", recent, 24)).toBe(true);
    });

    it("returns false for different strategy", () => {
      const recent: RecentEntry[] = [
        {
          symbol: "BTC/USD",
          timestamp: new Date().toISOString(),
          strategy: "momentum-v1",
        },
      ];
      expect(hasRecentDipEntry("BTC/USD", recent, 24)).toBe(false);
    });
  });

  describe("hoursHeld", () => {
    it("returns 0 for no enteredAt", () => {
      const position: Position = { symbol: "BTC/USD" } as Position;
      expect(hoursHeld(position)).toBe(0);
    });

    it("calculates hours held", () => {
      const position: Position = {
        symbol: "BTC/USD",
        enteredAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6h ago
      } as Position;
      expect(hoursHeld(position)).toBeGreaterThanOrEqual(5.9);
      expect(hoursHeld(position)).toBeLessThanOrEqual(6.1);
    });
  });

  describe("runDipStrategy", () => {
    it("generates entry signal when 24h return ≤ threshold", () => {
      const bars1h = new Map<string, Bar[]>([
        [
          "BTC/USD",
          new Array(25).fill(null).map((_, i) => ({
            symbol: "BTC/USD",
            open: i === 24 ? 63500 : 65000, // last hour green (close 64000 > open 63500)
            close: i === 0 ? 67000 : 64000, // -4.48%
            high: 67000,
          } as Bar)),
        ],
      ]);
      const positions: Position[] = [];
      const recent: RecentEntry[] = [];

      const result = runDipStrategy(
        defaultDipConfig,
        bars1h,
        positions,
        recent,
        100000
      );

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].type).toBe("entry");
      expect(result.signals[0].symbol).toBe("BTC/USD");
      expect(result.signals[0].reason).toContain("24h return");
    });

    it("skips entry if last candle is red (falling knife)", () => {
      const bars1h = new Map<string, Bar[]>([
        [
          "BTC/USD",
          new Array(25).fill(null).map((_, i) => ({
            symbol: "BTC/USD",
            open: i === 24 ? 65000 : 67000, // Last candle red (open > close)
            close: i === 0 ? 67000 : 64000,
            high: 67000,
          } as Bar)),
        ],
      ]);
      const positions: Position[] = [];
      const recent: RecentEntry[] = [];

      const result = runDipStrategy(
        defaultDipConfig,
        bars1h,
        positions,
        recent,
        100000
      );

      expect(result.signals).toHaveLength(0);
    });

    it("generates exit signal for take profit", () => {
      const bars1h = new Map<string, Bar[]>();
      const positions: Position[] = [
        {
          symbol: "BTC/USD",
          qty: 0.03,
          avgEntryPrice: 64000,
          currentPrice: 66560,
          unrealizedPnl: 76.8,
          unrealizedPnlPct: 4.0,
          enteredAt: new Date().toISOString(),
        },
      ];
      const recent: RecentEntry[] = [];

      const result = runDipStrategy(
        defaultDipConfig,
        bars1h,
        positions,
        recent,
        100000
      );

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].type).toBe("exit");
      expect(result.signals[0].reason).toContain("Take profit");
    });

    it("generates exit signal for stop loss", () => {
      const bars1h = new Map<string, Bar[]>();
      const positions: Position[] = [
        {
          symbol: "BTC/USD",
          qty: 0.03,
          avgEntryPrice: 64000,
          currentPrice: 58880,
          unrealizedPnl: -153.6,
          unrealizedPnlPct: -8.0,
          enteredAt: new Date().toISOString(),
        },
      ];
      const recent: RecentEntry[] = [];

      const result = runDipStrategy(
        defaultDipConfig,
        bars1h,
        positions,
        recent,
        100000
      );

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].type).toBe("exit");
      expect(result.signals[0].reason).toContain("Stop loss");
    });

    it("generates time exit after 72h with profit", () => {
      const bars1h = new Map<string, Bar[]>();
      const positions: Position[] = [
        {
          symbol: "BTC/USD",
          qty: 0.03,
          avgEntryPrice: 64000,
          currentPrice: 64320,
          unrealizedPnl: 9.6,
          unrealizedPnlPct: 0.5,
          enteredAt: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(), // 73h ago
        },
      ];
      const recent: RecentEntry[] = [];

      const result = runDipStrategy(
        defaultDipConfig,
        bars1h,
        positions,
        recent,
        100000
      );

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].type).toBe("exit");
      expect(result.signals[0].reason).toContain("Time exit");
    });

    it("generates scale-in signal when price drops 4% from entry", () => {
      const bars1h = new Map<string, Bar[]>();
      const positions: Position[] = [
        {
          symbol: "BTC/USD",
          qty: 0.03,
          avgEntryPrice: 64000,
          currentPrice: 61440, // -4%
          unrealizedPnl: -76.8,
          unrealizedPnlPct: -4.0,
          enteredAt: new Date().toISOString(),
          tranches: 1,
        },
      ];
      const recent: RecentEntry[] = [];

      const result = runDipStrategy(
        defaultDipConfig,
        bars1h,
        positions,
        recent,
        100000
      );

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].type).toBe("scale_in");
      expect(result.signals[0].reason).toContain("Scale-in");
    });
  });
});
