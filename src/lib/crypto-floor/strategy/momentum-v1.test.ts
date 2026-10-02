import { describe, it, expect } from "vitest";
import {
  calculateReturn,
  hasRecentEntry,
  runStrategy,
  defaultConfig,
  type Bar,
  type Position,
  type RecentEntry,
} from "./momentum-v1";

describe("momentum-v1 strategy", () => {
  describe("calculateReturn", () => {
    it("returns null for insufficient bars", () => {
      expect(calculateReturn([])).toBeNull();
      expect(calculateReturn([{ close: 100 } as Bar])).toBeNull();
    });

    it("calculates positive return", () => {
      const bars: Bar[] = [
        { close: 100 } as Bar,
        { close: 105 } as Bar,
      ];
      expect(calculateReturn(bars)).toBe(5);
    });

    it("calculates negative return", () => {
      const bars: Bar[] = [
        { close: 100 } as Bar,
        { close: 98 } as Bar,
      ];
      expect(calculateReturn(bars)).toBe(-2);
    });

    it("returns null for zero close", () => {
      const bars: Bar[] = [
        { close: 0 } as Bar,
        { close: 100 } as Bar,
      ];
      expect(calculateReturn(bars)).toBeNull();
    });
  });

  describe("hasRecentEntry", () => {
    it("returns false for no recent entries", () => {
      const recent: RecentEntry[] = [];
      expect(hasRecentEntry("BTC/USD", recent, 4)).toBe(false);
    });

    it("returns true for entry within interval", () => {
      const recent: RecentEntry[] = [
        {
          symbol: "BTC/USD",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
        },
      ];
      expect(hasRecentEntry("BTC/USD", recent, 4)).toBe(true);
    });

    it("returns false for entry outside interval", () => {
      const recent: RecentEntry[] = [
        {
          symbol: "BTC/USD",
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5h ago
        },
      ];
      expect(hasRecentEntry("BTC/USD", recent, 4)).toBe(false);
    });

    it("returns false for different symbol", () => {
      const recent: RecentEntry[] = [
        {
          symbol: "ETH/USD",
          timestamp: new Date().toISOString(),
        },
      ];
      expect(hasRecentEntry("BTC/USD", recent, 4)).toBe(false);
    });
  });

  describe("runStrategy", () => {
    it("halts when day P&L below threshold", () => {
      const bars = new Map<string, Bar[]>();
      const positions: Position[] = [];
      const recent: RecentEntry[] = [];
      
      const result = runStrategy(
        defaultConfig,
        bars,
        positions,
        recent,
        98000, // equity
        100000 // start of day
      );

      expect(result.shouldHalt).toBe(true);
      expect(result.haltReason).toContain("-2%");
      expect(result.signals).toHaveLength(0);
    });

    it("generates entry signal when return > threshold", () => {
      const bars = new Map<string, Bar[]>([
        [
          "BTC/USD",
          [
            { close: 67000 } as Bar,
            { close: 68500 } as Bar, // +2.24%
          ],
        ],
      ]);
      const positions: Position[] = [];
      const recent: RecentEntry[] = [];

      const result = runStrategy(
        defaultConfig,
        bars,
        positions,
        recent,
        100000, // equity
        100000
      );

      expect(result.shouldHalt).toBe(false);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].type).toBe("entry");
      expect(result.signals[0].symbol).toBe("BTC/USD");
      expect(result.signals[0].side).toBe("buy");
      expect(result.signals[0].qty).toBeCloseTo(2000 / 68500, 4); // 2% of 100k / price
    });

    it("skips entry if recent entry exists", () => {
      const bars = new Map<string, Bar[]>([
        [
          "BTC/USD",
          [
            { close: 67000 } as Bar,
            { close: 68500 } as Bar,
          ],
        ],
      ]);
      const positions: Position[] = [];
      const recent: RecentEntry[] = [
        {
          symbol: "BTC/USD",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const result = runStrategy(
        defaultConfig,
        bars,
        positions,
        recent,
        100000,
        100000
      );

      expect(result.signals).toHaveLength(0);
    });

    it("skips entry if max positions reached", () => {
      const bars = new Map<string, Bar[]>([
        [
          "BTC/USD",
          [
            { close: 67000 } as Bar,
            { close: 68500 } as Bar,
          ],
        ],
      ]);
      const positions: Position[] = [
        { symbol: "ETH/USD" } as Position,
        { symbol: "SOL/USD" } as Position,
        { symbol: "AVAX/USD" } as Position,
      ];
      const recent: RecentEntry[] = [];

      const result = runStrategy(
        defaultConfig,
        bars,
        positions,
        recent,
        100000,
        100000
      );

      expect(result.signals).toHaveLength(0);
    });

    it("generates exit signal for stop loss", () => {
      const bars = new Map<string, Bar[]>();
      const positions: Position[] = [
        {
          symbol: "BTC/USD",
          qty: 0.03,
          avgEntryPrice: 67000,
          currentPrice: 65995,
          unrealizedPnl: -30.15,
          unrealizedPnlPct: -1.5,
        },
      ];
      const recent: RecentEntry[] = [];

      const result = runStrategy(
        defaultConfig,
        bars,
        positions,
        recent,
        100000,
        100000
      );

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].type).toBe("exit");
      expect(result.signals[0].symbol).toBe("BTC/USD");
      expect(result.signals[0].side).toBe("sell");
      expect(result.signals[0].reason).toContain("Stop loss");
    });

    it("generates exit signal for take profit", () => {
      const bars = new Map<string, Bar[]>();
      const positions: Position[] = [
        {
          symbol: "BTC/USD",
          qty: 0.03,
          avgEntryPrice: 67000,
          currentPrice: 69010,
          unrealizedPnl: 60.30,
          unrealizedPnlPct: 3.0,
        },
      ];
      const recent: RecentEntry[] = [];

      const result = runStrategy(
        defaultConfig,
        bars,
        positions,
        recent,
        100000,
        100000
      );

      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].type).toBe("exit");
      expect(result.signals[0].reason).toContain("Take profit");
    });
  });
});
