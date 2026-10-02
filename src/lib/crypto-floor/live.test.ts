import { describe, expect, it } from "vitest";
import { effectiveFillPrice, liveBook, planLive, type CoinbaseState, type LivePlanInput } from "./live";
import { uuidFromSeed } from "./coinbase";
import { STRATEGIES } from "./strategies";
import type { Bar, DeskRow, FloorParamsRow, OrderRow } from "./types";

const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 2, 12, 5);
const bars = (symbol: string, closes: number[]): Bar[] => {
  const start = NOW - 5 * 60_000 - closes.length * H;
  return closes.map((c, i) => ({ symbol, timestamp: new Date(start + i * H).toISOString(), open: c, high: c, low: c, close: c, volume: 10 }));
};
const params: FloorParamsRow = {
  id: 1, version: 1, halted: false, halt_reason: null, halted_at: null, halted_by: null, halt_day_loss_pct: -2,
  day_paused_until: null, day_pause_reason: null, max_open_positions_total: 8, max_orders_per_tick: 3,
  live_max_total_usd: 100, live_max_trade_usd: 25, live_day_loss_usd: 10, live_paused_until: null, live_pause_reason: null, updated_at: "",
};
const desk = (over: Partial<DeskRow> = {}): DeskRow => ({
  id: "samurai", name: "SAMURAI", strategy: "momentum-v1", enabled: true, capital_usd: 25_000,
  params: { ...STRATEGIES["momentum-v1"].defaults }, version: 1, paused_until: null, pause_reason: null, live_enabled: true, ...over,
});
const cb = (over: Partial<CoinbaseState> = {}): CoinbaseState => ({
  configured: true, ok: true, error: null, canView: true, canTrade: true, canTransfer: false, usdAvailable: 500,
  coins: new Map(), prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 4000], ["SOL/USD", 200]]),
  products: new Map([["BTC/USD", { baseIncrement: "0.00000001", quoteIncrement: "0.01", quoteMin: 1 }], ["ETH/USD", { baseIncrement: "0.00000001", quoteIncrement: "0.01", quoteMin: 1 }]]),
  ...over,
});
let seq = 0;
const liveFill = (symbol: string, side: "buy" | "sell", qty: number, price: number): OrderRow => {
  seq++;
  const at = new Date(NOW - 10 * H).toISOString();
  return { client_order_id: `l${seq}`, created_at: at, book: liveBook("samurai"), desk: "samurai", strategy: "momentum-v1", mode: "live", symbol, side, intent: side === "buy" ? "entry" : "exit", qty, status: "filled", alpaca_order_id: null, filled_qty: qty, filled_avg_price: price, filled_at: at, reason: null };
};
const input = (over: Partial<LivePlanInput> = {}): LivePlanInput => ({
  now: NOW,
  params,
  desks: [desk()],
  universe: ["BTC/USD", "ETH/USD", "SOL/USD"],
  bars: new Map([["BTC/USD", bars("BTC/USD", [...Array.from({ length: 58 }, () => 100_000), 100_000, 103_000])], ["ETH/USD", bars("ETH/USD", Array.from({ length: 60 }, () => 4000))], ["SOL/USD", bars("SOL/USD", Array.from({ length: 60 }, () => 200))]]),
  prices: new Map(),
  dataStale: false,
  filledOrders: [],
  recentOrders: [],
  baselines: new Map([["live", 0]]),
  coinbase: cb(),
  ...over,
});

describe("planLive (real money)", () => {
  it("does nothing when no desk has real money switched on", () => {
    const p = planLive(input({ desks: [desk({ live_enabled: false })] }));
    expect(p.orders).toHaveLength(0);
    expect(p.signals).toHaveLength(0);
  });

  it("buys with the per-trade cap, a deterministic UUID and the USD increment", () => {
    const p = planLive(input());
    expect(p.orders).toHaveLength(1);
    const o = p.orders[0];
    expect(o).toMatchObject({ side: "buy", productId: "BTC-USD", quoteSize: "25.00", book: "live:samurai", intent: "entry" });
    expect(o.clientOrderId).toBe(uuidFromSeed("cf-live-momentum-v1-BTCUSD-buy-202610021205"));
  });

  it("refuses everything with a key that can transfer funds, without trade permission, unconnected, or with the kill switch", () => {
    expect(planLive(input({ coinbase: cb({ canTransfer: true }) })).blocked).toMatch(/TRANSFER/);
    expect(planLive(input({ coinbase: cb({ canTransfer: true }) })).orders).toHaveLength(0);
    expect(planLive(input({ coinbase: cb({ canTrade: false }) })).orders).toHaveLength(0);
    expect(planLive(input({ coinbase: cb({ configured: false }) })).blocked).toMatch(/not connected/);
    expect(planLive(input({ coinbase: cb({ ok: false, error: "timeout" }) })).blocked).toMatch(/timeout/);
    expect(planLive(input({ params: { ...params, halted: true } })).orders).toHaveLength(0);
  });

  it("never goes over the total cap or the USD on Coinbase", () => {
    // $90 already in ETH → only $10 of room
    const fills = [liveFill("ETH/USD", "buy", 0.0225, 4000)];
    const room = planLive(input({ filledOrders: fills, coinbase: cb({ coins: new Map([["ETH/USD", 0.0225]]) }) }));
    expect(room.exposureUsd).toBeCloseTo(90);
    expect(room.orders.find((o) => o.side === "buy")?.quoteSize).toBe("10.00");
    const full = planLive(input({ filledOrders: [liveFill("ETH/USD", "buy", 0.02475, 4000)], coinbase: cb({ coins: new Map([["ETH/USD", 0.02475]]) }) }));
    expect(full.signals.find((s) => s.signal.side === "buy")?.skipReason).toMatch(/cap reached/);
    const poor = planLive(input({ coinbase: cb({ usdAvailable: 1 }) }));
    expect(poor.signals[0].skipReason).toMatch(/Not enough USD/);
  });

  it("pauses new buys after the day-loss limit but still sells", () => {
    // Bought $100 of ETH at 4000; now 3500 → −$12.50 today (baseline 0). −12.5% also triggers momentum's stop.
    const fills = [liveFill("ETH/USD", "buy", 0.025, 4000)];
    const p = planLive(input({ filledOrders: fills, coinbase: cb({ coins: new Map([["ETH/USD", 0.025]]), prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 3500], ["SOL/USD", 200]]) }) }));
    expect(p.dayPnl).toBeCloseTo(-12.5);
    expect(p.pause?.until).toBe("2026-10-03T00:00:00.000Z");
    expect(p.orders.map((o) => o.side)).toEqual(["sell"]);
    expect(p.orders[0].baseSize).toBe("0.02500000");
  });

  it("a desk switched off keeps selling what it holds but never buys", () => {
    const fills = [liveFill("ETH/USD", "buy", 0.005, 4000)];
    const p = planLive(input({ desks: [desk({ live_enabled: false })], filledOrders: fills, coinbase: cb({ coins: new Map([["ETH/USD", 0.005]]), prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 3900], ["SOL/USD", 200]]) }) }));
    expect(p.liveDesks).toEqual(["samurai"]);
    expect(p.orders.map((o) => o.side)).toEqual(["sell"]);
    expect(p.signals.find((s) => s.signal.side === "buy")?.skipReason).toMatch(/switched off/);
  });

  it("sells only what Coinbase holds, rounded down to the coin increment", () => {
    const fills = [liveFill("ETH/USD", "buy", 0.005, 4000)];
    const p = planLive(input({ filledOrders: fills, coinbase: cb({ coins: new Map([["ETH/USD", 0.0049876543]]), prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 3900], ["SOL/USD", 200]]) }) }));
    expect(p.orders.find((o) => o.side === "sell")?.baseSize).toBe("0.00498765");
  });

  it("backs off for an hour after Coinbase rejects a buy", () => {
    const rejected: OrderRow = { ...liveFill("BTC/USD", "buy", 0.0002, 103_000), status: "rejected", filled_qty: 0, created_at: new Date(NOW - 20 * 60_000).toISOString() };
    const p = planLive(input({ recentOrders: [rejected] }));
    expect(p.orders).toHaveLength(0);
    expect(p.signals[0].skipReason).toMatch(/backing off/);
  });

  it("writes today's live baseline when missing", () => {
    expect(planLive(input({ baselines: new Map() })).baselinesToWrite).toEqual([{ book: "live", equity: 0 }]);
  });
});

describe("effectiveFillPrice", () => {
  it("folds Coinbase fees into the price", () => {
    expect(effectiveFillPrice("buy", 0.001, 100_000, 100, 1.2)).toBeCloseTo(101_200);
    expect(effectiveFillPrice("sell", 0.001, 100_000, null, 1.2)).toBeCloseTo(98_800);
    expect(effectiveFillPrice("buy", 0, 1, 0, 0)).toBeNull();
  });
});
