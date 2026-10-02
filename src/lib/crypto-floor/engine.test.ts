import { describe, expect, it } from "vitest";
import { clientOrderId, planTick, type PlanInput } from "./engine";
import { STRATEGIES } from "./strategies";
import type { Bar, DeskRow, ExperimentRow, FloorParamsRow, OrderRow } from "./types";

const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 2, 12, 5);

function bars(symbol: string, closes: number[]): Bar[] {
  const start = NOW - 5 * 60_000 - closes.length * H; // last bar closed at 12:00
  return closes.map((c, i) => ({ symbol, timestamp: new Date(start + i * H).toISOString(), open: c, high: c, low: c, close: c, volume: 10 }));
}
const flat = (symbol: string, price: number) => bars(symbol, Array.from({ length: 60 }, () => price));

function desk(id: DeskRow["id"], over: Partial<DeskRow> = {}): DeskRow {
  const strategy = ({ samurai: "momentum-v1", neon: "dip-v1", orbit: "swing-v1", phantom: "breakout-v1" } as const)[id];
  return { id, name: id.toUpperCase(), strategy, enabled: true, capital_usd: 25_000, params: { ...STRATEGIES[strategy].defaults }, version: 1, paused_until: null, pause_reason: null, ...over };
}

const params: FloorParamsRow = {
  id: 1, version: 1, halted: false, halt_reason: null, halted_at: null, halted_by: null, halt_day_loss_pct: -2,
  day_paused_until: null, day_pause_reason: null, max_open_positions_total: 8, max_orders_per_tick: 3, updated_at: "",
};

let seq = 0;
function filled(book: string, symbol: string, side: "buy" | "sell", qty: number, price: number, at = NOW - 10 * H): OrderRow {
  seq++;
  const iso = new Date(at).toISOString();
  return { client_order_id: `f${seq}`, created_at: iso, book, desk: book, strategy: null, mode: "paper", symbol, side, intent: side === "buy" ? "entry" : "exit", qty, status: "filled", alpaca_order_id: "a", filled_qty: qty, filled_avg_price: price, filled_at: iso, reason: null };
}

function input(over: Partial<PlanInput> = {}): PlanInput {
  const btc = bars("BTC/USD", [...Array.from({ length: 58 }, () => 100_000), 100_000, 103_000]); // +3% last closed hour
  return {
    now: NOW,
    params,
    desks: [desk("samurai")],
    experiments: [],
    universe: ["BTC/USD", "ETH/USD", "SOL/USD"],
    bars: new Map([["BTC/USD", btc], ["ETH/USD", flat("ETH/USD", 4000)], ["SOL/USD", flat("SOL/USD", 200)]]),
    prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 4000], ["SOL/USD", 200]]),
    dataStale: false,
    filledOrders: [],
    recentOrders: [],
    baselines: new Map([["samurai", 25_000], ["floor", 25_000]]),
    brokerQty: new Map(),
    buyingPower: 60_000,
    ...over,
  };
}

describe("planTick", () => {
  it("turns a momentum signal into one idempotent paper order sized at 2% of desk equity", () => {
    const plan = planTick(input());
    expect(plan.orders).toHaveLength(1);
    const o = plan.orders[0];
    expect(o.clientOrderId).toBe("cf-momentum-v1-BTCUSD-buy-202610021205");
    expect(o.clientOrderId).toBe(clientOrderId("momentum-v1", "BTC/USD", "buy", NOW));
    expect(o.qty * 103_000).toBeCloseTo(500, 0);
    expect(o.intent).toBe("entry");
  });

  it("kill switch: no orders at all, every signal is skipped", () => {
    const plan = planTick(input({ params: { ...params, halted: true } }));
    expect(plan.halted).toBe(true);
    expect(plan.orders).toHaveLength(0);
    expect(plan.signals.every((s) => s.action === "skipped")).toBe(true);
  });

  it("stale data blocks entries but still runs exits", () => {
    const fills = [filled("samurai", "ETH/USD", "buy", 1, 4000)];
    const plan = planTick(input({
      dataStale: true,
      filledOrders: fills,
      prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 3900], ["SOL/USD", 200]]), // ETH −2.5% → stop
      brokerQty: new Map([["ETH/USD", 1]]),
    }));
    expect(plan.orders.map((o) => `${o.symbol}:${o.side}`)).toEqual(["ETH/USD:sell"]);
    expect(plan.signals.find((s) => s.signal.side === "buy")?.skipReason).toMatch(/stale/i);
  });

  it("a stale coin blocks entries in that coin only", () => {
    const plan = planTick(input({ staleSymbols: new Set(["BTC/USD"]) }));
    expect(plan.orders).toHaveLength(0);
    expect(plan.signals[0].skipReason).toMatch(/stale for BTC/);
    const other = planTick(input({ staleSymbols: new Set(["SOL/USD"]) }));
    expect(other.orders).toHaveLength(1);
  });

  it("pauses a desk whose day P&L hits the loss limit, and resumes it the next UTC day", () => {
    const fills = [filled("samurai", "SOL/USD", "buy", 100, 200)]; // $20k of SOL
    const plan = planTick(input({
      filledOrders: fills,
      prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 4000], ["SOL/USD", 194]]), // −$600 = −2.4%
      brokerQty: new Map([["SOL/USD", 100]]),
      params: { ...params, halt_day_loss_pct: -2 },
      baselines: new Map([["samurai", 25_000], ["floor", 1_000_000]]),
    }));
    expect(plan.deskPauses).toHaveLength(1);
    expect(plan.deskPauses[0].until).toBe("2026-10-03T00:00:00.000Z");
    expect(plan.orders.some((o) => o.side === "buy")).toBe(false);
    expect(plan.orders.some((o) => o.side === "sell" && o.symbol === "SOL/USD")).toBe(true); // −3% stop still exits

    const next = planTick(input({ desks: [desk("samurai", { paused_until: "2026-10-02T00:00:00.000Z", pause_reason: "x" })] }));
    expect(next.deskResumes).toEqual(["samurai"]);
    expect(next.orders).toHaveLength(1);
  });

  it("floor-wide day loss pauses all entries", () => {
    const plan = planTick(input({ baselines: new Map([["samurai", 25_000], ["floor", 26_000]]) }));
    expect(plan.floorPause?.until).toBe("2026-10-03T00:00:00.000Z");
    expect(plan.orders).toHaveLength(0);
  });

  it("sells only what the broker can deliver and skips when it holds nothing", () => {
    const fills = [filled("samurai", "ETH/USD", "buy", 1, 4000)];
    const prices = new Map([["BTC/USD", 100_000], ["ETH/USD", 3900], ["SOL/USD", 200]]);
    const capped = planTick(input({ filledOrders: fills, prices, brokerQty: new Map([["ETH/USD", 0.9975]]) }));
    expect(capped.orders.find((o) => o.side === "sell")?.qty).toBeCloseTo(0.9975);
    const none = planTick(input({ filledOrders: fills, prices, brokerQty: new Map() }));
    expect(none.orders.find((o) => o.side === "sell")).toBeUndefined();
    expect(none.signals.find((s) => s.signal.side === "sell")?.skipReason).toMatch(/nothing to sell/);
  });

  it("never stacks an order on an unresolved one for the same desk and coin", () => {
    // An earlier sell whose outcome Alpaca has not confirmed yet (status unknown).
    const open: OrderRow = { ...filled("samurai", "BTC/USD", "sell", 0.001, 100_000, NOW - 60_000), status: "unknown", filled_qty: 0 };
    const plan = planTick(input({ recentOrders: [open] }));
    expect(plan.orders).toHaveLength(0);
    expect(plan.signals[0].skipReason).toMatch(/unresolved/);
  });

  it("respects max open positions, max orders per tick (exits first) and buying power", () => {
    const full = planTick(input({ params: { ...params, max_open_positions_total: 0 } }));
    expect(full.orders).toHaveLength(0);
    const poor = planTick(input({ buyingPower: 100 }));
    expect(poor.signals[0].skipReason).toMatch(/buying power/);

    const fills = ["ETH/USD", "SOL/USD"].map((s) => filled("samurai", s, "buy", 1, s === "ETH/USD" ? 4000 : 200));
    const one = planTick(input({
      params: { ...params, max_orders_per_tick: 1 },
      filledOrders: fills,
      prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 3900], ["SOL/USD", 195]]),
      brokerQty: new Map([["ETH/USD", 1], ["SOL/USD", 1]]),
    }));
    expect(one.orders).toHaveLength(1);
    expect(one.orders[0].side).toBe("sell");
  });

  it("writes missing start-of-day baselines", () => {
    const plan = planTick(input({ baselines: new Map() }));
    expect(plan.baselinesToWrite.map((b) => b.book).sort()).toEqual(["floor", "samurai"]);
  });

  it("disabled desk: no entries, exits still run", () => {
    const fills = [filled("samurai", "ETH/USD", "buy", 1, 4000)];
    const plan = planTick(input({
      desks: [desk("samurai", { enabled: false })],
      filledOrders: fills,
      prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 3900], ["SOL/USD", 200]]),
      brokerQty: new Map([["ETH/USD", 1]]),
    }));
    expect(plan.orders.map((o) => o.side)).toEqual(["sell"]);
  });

  it("runs experiments as shadow books and stops expired ones", () => {
    const exp = (over: Partial<ExperimentRow>): ExperimentRow => ({
      id: "11111111-2222-3333-4444-555555555555", created_at: "", desk: "samurai", strategy: "momentum-v1", name: "t", hypothesis: null,
      params: { entryThresholdPct: 1 }, capital_usd: 25_000, status: "running", proposed_by: null, started_at: null, ends_at: null, ended_at: null, backtest: null, notes: null, ...over,
    });
    const plan = planTick(input({ experiments: [exp({}), exp({ id: "99999999-0000-0000-0000-000000000000", ends_at: new Date(NOW - 1).toISOString() })] }));
    expect(plan.shadowFills).toHaveLength(1);
    expect(plan.shadowFills[0].clientOrderId).toBe("sx-11111111-BTCUSD-buy-202610021205");
    expect(plan.shadowFills[0].refPrice).toBeGreaterThan(103_000); // buy slippage
    expect(plan.experimentsToStop.map((e) => e.id)).toEqual(["99999999-0000-0000-0000-000000000000"]);
    expect(plan.orders).toHaveLength(1); // the live desk still trades
  });
});
