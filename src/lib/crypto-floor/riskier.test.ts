/**
 * Acceptance tests for the 2026-10-02 riskier paper floor (spec: crypto-floor-riskier-2026-10-02).
 * Loss cap · options max loss / no naked shorts · sessions · reconcile (PEPE) · foreign positions · no-fallback keys ·
 * Coinbase live stays off · SAMURAI/ORBIT entries on a fixture where the old rules produced none · lanes.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { floorAlpacaConfig, missingFloorKeys } from "./alpaca";
import { assetClass, marketSession, orderShape, parseOcc } from "./assets";
import { runBacktest } from "./backtest";
import { DESK_LANES } from "./desks";
import { planTick, type OptionCandidate, type PlanInput } from "./engine";
import { buildBooks } from "./ledger";
import { planLive } from "./live";
import { DESK_DAY_LOSS_CAP, OPTION_MAX_LOSS, OWNER_ONLY_RISK_KEYS, deskDailyLossCap, optionMaxLossUsd, sizeLongOption } from "./risk";
import { LEGACY_DEFAULTS, STRATEGIES, effectiveParams, validateParams } from "./strategies";
import { strategyComparison } from "./strategyStats";
import { RONIN_SEED_SPEC } from "./strategy/custom-v1";
import { runTick } from "./tick";
import type { Bar, DeskRow, FloorParamsRow, OrderRow, StrategyId } from "./types";

const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 2, 12, 5); // Fri 08:05 ET (extended session)
const REGULAR = Date.UTC(2026, 9, 2, 15, 5); // Fri 11:05 ET
const SATURDAY = Date.UTC(2026, 9, 3, 3, 0); // Sat 03:00 UTC

function series(symbol: string, closes: number[], now = NOW, volume = 10): Bar[] {
  const start = now - 5 * 60_000 - closes.length * H;
  return closes.map((c, i) => ({ symbol, timestamp: new Date(start + i * H).toISOString(), open: i ? closes[i - 1] : c, high: Math.max(c, i ? closes[i - 1] : c), low: Math.min(c, i ? closes[i - 1] : c), close: c, volume }));
}
const flat = (s: string, p: number, now = NOW) => series(s, Array.from({ length: 60 }, () => p), now);
const jump = (s: string, p: number, now = NOW) => series(s, [...Array.from({ length: 59 }, () => p), p * 1.03], now); // +3% last hour

const params: FloorParamsRow = {
  id: 1, version: 1, halted: false, halt_reason: null, halted_at: null, halted_by: null, halt_day_loss_pct: -2,
  day_paused_until: null, day_pause_reason: null, max_open_positions_total: 12, max_orders_per_tick: 3,
  live_max_total_usd: 100, live_max_trade_usd: 25, live_day_loss_usd: 10, live_paused_until: null, live_pause_reason: null, updated_at: "",
};
const STRAT: Record<DeskRow["id"], StrategyId> = { samurai: "momentum-v1", neon: "dip-v1", orbit: "swing-v1", phantom: "breakout-v1", ronin: "custom-v1", cycle: "cycle-straddle-v1" };
function desk(id: DeskRow["id"], over: Partial<DeskRow> = {}): DeskRow {
  return { id, name: id.toUpperCase(), strategy: STRAT[id], enabled: true, capital_usd: 25_000, params: { ...(LEGACY_DEFAULTS[STRAT[id]] ?? {}) }, version: 1, paused_until: null, pause_reason: null, live_enabled: false, ...over };
}
let seq = 0;
function fill(book: string, symbol: string, side: "buy" | "sell", qty: number, price: number, strategy: string | null = null, at = NOW - 10 * H): OrderRow {
  seq++;
  const iso = new Date(at).toISOString();
  return { client_order_id: `cf-t${seq}`, created_at: iso, book, desk: book, strategy, mode: "paper", symbol, side, intent: side === "buy" ? "entry" : "exit", qty, status: "filled", alpaca_order_id: "a", filled_qty: qty, filled_avg_price: price, filled_at: iso, reason: null };
}
function input(over: Partial<PlanInput> = {}): PlanInput {
  const now = over.now ?? NOW;
  return {
    now,
    params,
    desks: [desk("samurai")],
    experiments: [],
    universe: ["BTC/USD", "ETH/USD", "SOL/USD"],
    bars: new Map([["BTC/USD", jump("BTC/USD", 100_000, now)], ["ETH/USD", flat("ETH/USD", 4000, now)], ["SOL/USD", flat("SOL/USD", 200, now)]]),
    prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 4000], ["SOL/USD", 200]]),
    dataStale: false,
    filledOrders: [],
    recentOrders: [],
    baselines: new Map([["samurai", 25_000], ["neon", 25_000], ["orbit", 25_000], ["phantom", 25_000], ["ronin", 25_000], ["floor", 125_000]]),
    brokerQty: new Map(),
    buyingPower: 200_000,
    ...over,
  };
}

describe("1. hard per-desk daily loss cap", () => {
  const losing = () => ({
    filledOrders: [fill("samurai", "SOL/USD", "buy", 100, 200)], // $20k SOL
    prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 4000], ["SOL/USD", 188]]), // −$1,200 = −4.8% of $25k
    brokerQty: new Map([["SOL/USD", 100]]),
  });
  it("a desk at its cap opens nothing new (any lane, any asset class), exits still run", () => {
    const plan = planTick(input({ ...losing(), stockUniverse: ["NVDA"], bars: new Map([...input().bars, ["NVDA", jump("NVDA", 180)]]), prices: new Map([...losing().prices, ["NVDA", 185.4]]) }));
    const d = plan.desks[0];
    expect(d.atLossCap).toBe(true);
    expect(d.lossCapUsd).toBeCloseTo(-1000);
    expect(d.lossCapRemainingUsd).toBe(0);
    expect(plan.orders.filter((o) => o.side === "buy")).toHaveLength(0);
    expect(plan.signals.filter((s) => s.signal.side === "buy").every((s) => s.action === "skipped")).toBe(true);
    expect(plan.orders.map((o) => `${o.symbol}:${o.side}`)).toEqual(["SOL/USD:sell"]); // stop still exits
    expect(plan.deskPauses[0]).toMatchObject({ desk: "samurai", until: "2026-10-03T00:00:00.000Z" });
  });
  it("resets the next UTC day", () => {
    const nextDay = NOW + 13 * H; // 01:05 UTC Oct 3
    const plan = planTick(input({ now: nextDay, desks: [desk("samurai", { paused_until: "2026-10-03T00:00:00.000Z", pause_reason: "Daily loss cap hit" })], baselines: new Map([["samurai", 25_000]]) }));
    expect(plan.deskResumes).toEqual(["samurai"]);
    expect(plan.desks[0].atLossCap).toBe(false);
    expect(plan.orders.some((o) => o.side === "buy")).toBe(true);
  });
  it("agents, the review and the lab cannot loosen it", () => {
    for (const id of Object.keys(STRATEGIES) as StrategyId[]) {
      for (const key of OWNER_ONLY_RISK_KEYS) {
        expect(validateParams(id, { [key]: -50 }).ok).toBe(false); // lab/agents write params only through validateParams
        expect(key in effectiveParams(id, { [key]: -50 })).toBe(false);
      }
    }
    // A loss-cap key smuggled into desk params is ignored by the engine.
    const smuggled = planTick(input({ ...losing(), desks: [desk("samurai", { params: { dayLossPct: -50 } as never })] }));
    expect(smuggled.desks[0].dayLossLimitPct).toBe(-4);
    expect(smuggled.desks[0].atLossCap).toBe(true);
    // Owner override only inside bounds; anything looser falls back to the default.
    expect(deskDailyLossCap({ risk: { dayLossPct: -6 } })).toBe(-6);
    expect(deskDailyLossCap({ risk: { dayLossPct: -50 } })).toBe(DESK_DAY_LOSS_CAP.defaultPct);
    expect(deskDailyLossCap({ risk: { dayLossPct: 5 } })).toBe(DESK_DAY_LOSS_CAP.defaultPct);
    // No agent/lab/review code path writes the risk column.
    for (const f of ["lab.ts", "research.ts", "agentChat.ts", "review.ts", "tick.ts"]) {
      const src = readFileSync(path.join(__dirname, f), "utf8");
      expect(src).not.toMatch(/\.update\(\{[^}]*\brisk\b/);
    }
  });
});

describe("2. options: defined risk, max loss per position, no naked shorts", () => {
  it("sizing never exceeds the max loss for any premium", () => {
    for (let ask = 0.01; ask < 12; ask += 0.07) {
      for (const cap of [25, 100, 250, 999]) {
        const s = sizeLongOption(ask, cap);
        if (s.ok) {
          expect(s.qty).toBeGreaterThanOrEqual(1);
          expect(Number.isInteger(s.qty)).toBe(true);
          expect(s.limitPrice).toBeGreaterThanOrEqual(ask - 1e-9);
          expect(s.qty * s.limitPrice * 100).toBeLessThanOrEqual(cap + 1e-6);
          expect(s.maxLossUsd).toBeCloseTo(s.qty * s.limitPrice * 100);
        }
      }
    }
    expect(sizeLongOption(4.1, 250).ok).toBe(false); // one contract = $410 > $250
    expect(optionMaxLossUsd({ risk: { optionMaxLossUsd: 50_000 } })).toBe(OPTION_MAX_LOSS.defaultUsd);
  });

  // SPY: slow decline then a 3-hour rally → EMA9 crosses above EMA21 within the last 3 bars.
  const spy = series("SPY", [...Array.from({ length: 36 }, (_, i) => 600 - i * 0.3), 592, 598, 606], REGULAR, 1000);
  const chain: OptionCandidate[] = [
    { symbol: "SPY261016C00605000", right: "call", strike: 605, expiration: "2026-10-16", bid: 1.2, ask: 1.23 },
    { symbol: "SPY261016C00620000", right: "call", strike: 620, expiration: "2026-10-16", bid: 0.4, ask: 0.42 },
    { symbol: "SPY261003C00606000", right: "call", strike: 606, expiration: "2026-10-03", bid: 0.5, ask: 0.52 }, // < 7 DTE
    { symbol: "SPY261016P00605000", right: "put", strike: 605, expiration: "2026-10-16", bid: 3.0, ask: 3.1 },
  ];
  const orbitIn = (over: Partial<PlanInput> = {}) =>
    input({ now: REGULAR, session: "regular", desks: [desk("orbit")], universe: [], bars: new Map([["SPY", spy]]), prices: new Map([["SPY", 606]]), stockUniverse: ["SPY"], optionChains: new Map([["SPY", chain]]), ...over });

  it("ORBIT buys a long call sized to the cap (premium × 100 × contracts ≤ max loss)", () => {
    const plan = planTick(orbitIn());
    const o = plan.orders.find((x) => x.assetClass === "option");
    expect(o).toBeDefined();
    expect(o).toMatchObject({ symbol: "SPY261016C00605000", side: "buy", intent: "entry", orderType: "limit", timeInForce: "day", extendedHours: false, limitPrice: 1.23, qty: 2 });
    expect(o!.maxLossUsd).toBeCloseTo(246);
    expect(o!.qty * o!.limitPrice! * 100).toBeLessThanOrEqual(250);
    expect(o!.clientOrderId.startsWith("cf-options-v1-")).toBe(true);
    const bigger = planTick(orbitIn({ desks: [desk("orbit", { risk: { optionMaxLossUsd: 600 } })] })).orders.find((x) => x.assetClass === "option");
    expect(bigger!.qty).toBe(4);
  });
  it("options are only planned in regular hours", () => {
    const plan = planTick(orbitIn({ session: "extended" }));
    expect(plan.orders.some((o) => o.assetClass === "option")).toBe(false);
  });
  it("no naked short option can be planned: sells close held longs only, capped at ledger AND broker", () => {
    const occ = "SPY261016C00605000";
    const held = [fill("orbit", occ, "buy", 2, 2.0, "options-v1")]; // 2 contracts at $200 each
    const prices = new Map([["SPY", 606], [occ, 80]]); // premium −60% → option stop
    const plan = planTick(orbitIn({ filledOrders: held, prices, brokerQty: new Map([[occ, 5]]), optionChains: new Map() }));
    const sell = plan.orders.find((o) => o.symbol === occ);
    expect(sell).toMatchObject({ side: "sell", qty: 2, assetClass: "option" }); // never more than the 2 held, though the broker shows 5
    // Not held by the ledger → nothing to sell, whatever the broker holds (e.g. AwadBot's AAPL option).
    const foreign = planTick(orbitIn({ brokerQty: new Map([["AAPL261023C00340000", 5]]) }));
    expect(foreign.orders.some((o) => o.side === "sell")).toBe(false);
    // Every planned option order in any of these plans is a long-premium buy or a closing sell of a held long.
    for (const p of [plan, foreign, planTick(orbitIn())]) {
      for (const o of p.orders.filter((x) => x.assetClass === "option")) {
        if (o.side === "buy") expect(o.maxLossUsd).toBeLessThanOrEqual(250);
        else expect(o.qty).toBeLessThanOrEqual(2);
      }
    }
  });
  it("ledger values options per contract", () => {
    const b = buildBooks([fill("orbit", "SPY261016C00605000", "buy", 2, 1.23, "options-v1")]).get("orbit")!;
    expect(b.positions.get("SPY261016C00605000")!.costBasis).toBeCloseTo(246);
    expect(parseOcc("AAPL261023C00340000")).toEqual({ underlying: "AAPL", expiration: "2026-10-23", right: "call", strike: 340 });
  });
});

describe("3. sessions: crypto 24/7, stocks regular + extended, options regular only", () => {
  const nvda = (now: number) => ({ stockUniverse: ["NVDA"], bars: new Map([["BTC/USD", flat("BTC/USD", 100_000, now)], ["NVDA", jump("NVDA", 180, now)]]), prices: new Map([["BTC/USD", 100_000], ["NVDA", 185.4]]) });
  it("extended hours: stock orders are LIMIT + DAY + extended_hours, whole shares", () => {
    expect(marketSession(NOW)).toBe("extended");
    const plan = planTick(input(nvda(NOW)));
    const o = plan.orders.find((x) => x.symbol === "NVDA")!;
    expect(o).toMatchObject({ assetClass: "stock", orderType: "limit", timeInForce: "day", extendedHours: true });
    expect(Number.isInteger(o.qty)).toBe(true);
    expect(o.limitPrice).toBeCloseTo(185.4 * 1.005, 2);
  });
  it("regular hours: stock orders are market/day", () => {
    const plan = planTick(input({ now: REGULAR, ...nvda(REGULAR) }));
    expect(plan.orders.find((x) => x.symbol === "NVDA")).toMatchObject({ orderType: "market", timeInForce: "day", extendedHours: false });
  });
  it("crypto is planned 24/7 (Saturday night) with no quiet hours or day pause; stocks wait", () => {
    expect(marketSession(SATURDAY)).toBe("closed");
    const plan = planTick(input({ now: SATURDAY, bars: new Map([["BTC/USD", jump("BTC/USD", 100_000, SATURDAY)], ["NVDA", jump("NVDA", 180, SATURDAY)]]), stockUniverse: ["NVDA"], prices: new Map([["BTC/USD", 103_000], ["NVDA", 185.4]]) }));
    expect(plan.orders.map((o) => o.symbol)).toContain("BTC/USD");
    expect(plan.orders.some((o) => o.symbol === "NVDA")).toBe(false);
    expect(plan.floorPause).toBeNull();
    expect(orderShape("option", "extended").ok).toBe(false);
    expect(orderShape("crypto", "closed").ok).toBe(true);
  });
});

describe("4/5. broker reconcile on floor-owned positions only", () => {
  it("PEPE: desk ledger 668M vs broker 0 → cleared, no sell attempted", () => {
    const pepe = series("PEPE/USD", Array.from({ length: 60 }, () => 0.00001));
    const plan = planTick(input({
      desks: [desk("ronin", { spec: RONIN_SEED_SPEC, risk: { dayLossPct: -5 } })],
      bars: new Map([["PEPE/USD", pepe]]),
      prices: new Map([["PEPE/USD", 0.0000095]]),
      filledOrders: [fill("ronin", "PEPE/USD", "buy", 668_000_000, 0.00001, "custom-v1")],
      brokerQty: new Map(),
    }));
    expect(plan.reconcile).toHaveLength(1);
    expect(plan.reconcile[0]).toMatchObject({ book: "ronin", symbol: "PEPE/USD", brokerQty: 0, reduceBy: 668_000_000 });
    expect(plan.reconcileRows[0].client_order_id.startsWith("rc-ronin-PEPEUSD-")).toBe(true);
    expect(plan.orders.some((o) => o.symbol === "PEPE/USD")).toBe(false);
    expect(plan.desks[0].marked.positions.find((p) => p.symbol === "PEPE/USD")).toBeUndefined();
  });
  it("partial: stops evaluate the real (broker-backed) quantity", () => {
    const plan = planTick(input({
      filledOrders: [fill("samurai", "SOL/USD", "buy", 10, 200)],
      prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 4000], ["SOL/USD", 190]]), // −5% → stop
      brokerQty: new Map([["SOL/USD", 4]]),
    }));
    expect(plan.reconcile[0]).toMatchObject({ symbol: "SOL/USD", claimedQty: 10, brokerQty: 4 });
    expect(plan.reconcile[0].reduceBy).toBeCloseTo(6);
    expect(plan.orders.find((o) => o.symbol === "SOL/USD")).toMatchObject({ side: "sell" });
    expect(plan.orders.find((o) => o.symbol === "SOL/USD")!.qty).toBeCloseTo(4);
  });
  it("never plans an order on a position it didn't open (AMD stock, AAPL option on the shared account) and never adopts", () => {
    const plan = planTick(input({ now: REGULAR, session: "regular", desks: [desk("samurai"), desk("orbit"), desk("neon"), desk("phantom")], brokerQty: new Map([["AMD", 100], ["AAPL261023C00340000", 5], ["PEPE/USD", 1e9]]) }));
    for (const s of ["AMD", "AAPL261023C00340000", "PEPE/USD"]) expect(plan.orders.some((o) => o.symbol === s)).toBe(false);
    expect(plan.reconcile).toHaveLength(0);
    expect(plan.desks.every((d) => d.marked.positions.length === 0)).toBe(true);
  });
  it("orders not placed by the floor (no cf-/rc- id) never enter a paper book", () => {
    const foreign: OrderRow = { ...fill("samurai", "AMD", "buy", 100, 150), client_order_id: "awadbot-123" };
    const plan = planTick(input({ filledOrders: [foreign], brokerQty: new Map([["AMD", 100]]) }));
    expect(plan.desks[0].marked.positions).toHaveLength(0);
  });
  it("in-flight symbols are not reconciled (a fresh fill the broker list may not show yet)", () => {
    const fresh = fill("samurai", "ETH/USD", "buy", 1, 4000, "momentum-v1", NOW - 60_000);
    const plan = planTick(input({ filledOrders: [fresh], recentOrders: [fresh], brokerQty: new Map() }));
    expect(plan.reconcile).toHaveLength(0);
  });
});

describe("6. own Alpaca account, no fallback", () => {
  afterEach(() => vi.restoreAllMocks());
  it("never falls back to AwadBot's ALPACA_* keys", () => {
    expect(floorAlpacaConfig({ ALPACA_API_KEY: "awadbot", ALPACA_SECRET_KEY: "awadbot", NODE_ENV: "test" } as NodeJS.ProcessEnv)).toBeNull();
    expect(missingFloorKeys({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toEqual(["CRYPTO_FLOOR_ALPACA_API_KEY", "CRYPTO_FLOOR_ALPACA_SECRET_KEY"]);
    const cfg = floorAlpacaConfig({ CRYPTO_FLOOR_ALPACA_API_KEY: "k", CRYPTO_FLOOR_ALPACA_SECRET_KEY: "s", ALPACA_API_KEY: "awadbot", ALPACA_SECRET_KEY: "awadbot", NODE_ENV: "test" } as NodeJS.ProcessEnv)!;
    expect(cfg.keyId).toBe("k");
    expect(cfg.secret).toBe("s");
    expect(cfg.dedicated).toBe(true);
  });

  it("without keys: no broker call, no order, heartbeat + status say 'no own account', tick doesn't crash", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const db = fakeDb({ desks: [desk("samurai"), desk("ronin"), desk("cycle", { params: {} })] });
    const r = await runTick({ db: db.client as never, alpaca: null, tradeMode: "paper", now: () => NOW, sleep: async () => {} });
    expect(r.ok).toBe(true);
    expect(r.noOwnAccount).toBe(true);
    expect(r.ordersSubmitted).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(db.inserted.crypto_floor_orders ?? []).toHaveLength(0);
    const hb = (db.inserted.crypto_floor_events ?? []).find((e) => e.type === "heartbeat") as { payload: Record<string, unknown> } | undefined;
    expect(hb?.payload.noOwnAccount).toBe(true);
    expect(String((hb?.payload as { title?: string }).title ?? "")).toMatch(/NO OWN ACCOUNT/);
    expect((hb?.payload.desks as unknown[]).length).toBe(3);
    const sys = (db.inserted.crypto_floor_events ?? []).find((e) => e.type === "system") as { payload: Record<string, unknown> } | undefined;
    expect(sys?.payload.noOwnAccount).toBe(true);
  });
});

describe("7. Coinbase real money stays off", () => {
  it("no paper plan ever carries a live order; live planner sends nothing with every desk off", () => {
    const desks = (["samurai", "neon", "orbit", "phantom", "ronin"] as const).map((id) => desk(id, id === "ronin" ? { spec: RONIN_SEED_SPEC } : {}));
    expect(desks.every((d) => d.live_enabled === false)).toBe(true);
    const plan = planTick(input({ desks }));
    expect([...plan.orders, ...plan.shadowFills].every((o) => o.mode !== ("live" as string))).toBe(true);
    const live = planLive({ now: NOW, params, desks, universe: ["BTC/USD"], bars: input().bars, prices: new Map(), dataStale: false, filledOrders: [], recentOrders: [], baselines: new Map([["live", 0]]), coinbase: { configured: true, ok: true, error: null, canView: true, canTrade: true, canTransfer: false, usdAvailable: 500, coins: new Map(), prices: new Map([["BTC/USD", 103_000]]), products: new Map() } });
    expect(live.orders).toHaveLength(0);
    for (const f of ["tick.ts", "engine.ts", "reconcile.ts", "risk.ts"]) {
      expect(readFileSync(path.join(__dirname, f), "utf8")).not.toMatch(/live_enabled\s*:\s*true/);
    }
  });
});

describe("9. SAMURAI and ORBIT trade on a realistic fixture where the old rules produced nothing", () => {
  // 10 days of a steady grind higher: hourly moves between −0.3% and +0.9% (never the old 2% momentum trigger),
  // EMA20 already above EMA50 when it is first defined (no fresh cross for the old swing rule).
  const pattern = [0.2, -0.1, 0.9, 0.3, -0.3, 0.4, 0.1, 0.8, -0.2, 0.3];
  const mk = (symbol: string, base: number) => {
    const closes: number[] = [];
    let p = base;
    for (let i = 0; i < 240; i++) {
      p *= 1 + pattern[i % pattern.length] / 100;
      closes.push(p);
    }
    return series(symbol, closes, NOW, 10);
  };
  const universe = ["BTC/USD", "ETH/USD", "SOL/USD"];
  const bars = new Map(universe.map((s, i) => [s, mk(s, [100_000, 4000, 200][i])]));
  it("SAMURAI (momentum-v1)", () => {
    const old = runBacktest({ strategy: "momentum-v1", params: LEGACY_DEFAULTS["momentum-v1"]!, bars, universe, capital: 25_000 });
    const now = runBacktest({ strategy: "momentum-v1", params: effectiveParams("momentum-v1", LEGACY_DEFAULTS["momentum-v1"]), bars, universe, capital: 25_000 });
    expect(old.trades + old.openAtEnd).toBe(0);
    expect(now.trades + now.openAtEnd).toBeGreaterThan(0);
  });
  it("ORBIT (swing-v1)", () => {
    const old = runBacktest({ strategy: "swing-v1", params: LEGACY_DEFAULTS["swing-v1"]!, bars, universe, capital: 25_000 });
    const now = runBacktest({ strategy: "swing-v1", params: effectiveParams("swing-v1", LEGACY_DEFAULTS["swing-v1"]), bars, universe, capital: 25_000 });
    expect(old.trades + old.openAtEnd).toBe(0);
    expect(now.trades + now.openAtEnd).toBeGreaterThan(0);
  });
  it("stored params equal to the old defaults read as the new riskier defaults; tuned values are kept", () => {
    expect(effectiveParams("momentum-v1", LEGACY_DEFAULTS["momentum-v1"]).entryThresholdPct).toBe(0.75);
    expect(effectiveParams("momentum-v1", { entryThresholdPct: 2.5 }).entryThresholdPct).toBe(2.5);
    expect(effectiveParams("swing-v1", LEGACY_DEFAULTS["swing-v1"])).toMatchObject({ fastEma: 9, slowEma: 21, trendEntry: true });
  });
});

describe("3b. side-by-side lanes and per-strategy results", () => {
  it("every desk has its lanes; each lane strategy runs on one desk only", () => {
    const all = Object.values(DESK_LANES).flat();
    expect(new Set(all).size).toBe(all.length);
    expect(DESK_LANES.samurai).toContain("trend-v1");
    expect(DESK_LANES.neon).toContain("meanrev-v1");
    expect(DESK_LANES.phantom).toContain("scalp-v1");
    expect(DESK_LANES.orbit).toContain("options-v1");
  });
  it("a position belongs to the lane that opened it; only that lane exits it", () => {
    // trend-v1 opened ETH; momentum-v1's −2% stop must NOT sell it (trend-v1's stop is −3%).
    const plan = planTick(input({ filledOrders: [fill("samurai", "ETH/USD", "buy", 1, 4000, "trend-v1")], prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 3900], ["SOL/USD", 200]]), brokerQty: new Map([["ETH/USD", 1]]) }));
    expect(plan.orders.some((o) => o.symbol === "ETH/USD")).toBe(false);
    const deeper = planTick(input({ filledOrders: [fill("samurai", "ETH/USD", "buy", 1, 4000, "trend-v1")], prices: new Map([["BTC/USD", 103_000], ["ETH/USD", 3850], ["SOL/USD", 200]]), brokerQty: new Map([["ETH/USD", 1]]) }));
    expect(deeper.orders.find((o) => o.symbol === "ETH/USD")).toMatchObject({ side: "sell", strategy: "trend-v1" });
  });
  it("scalp-v1 enters on a strong 15m bar", () => {
    const m15 = 15 * 60_000;
    const closes = [...Array.from({ length: 30 }, (_, i) => 100 + i * 0.02), 101.2];
    const b15 = closes.map((c, i) => ({ symbol: "BTC/USD", timestamp: new Date(NOW - 5 * 60_000 - (closes.length - i) * m15).toISOString(), open: i ? closes[i - 1] : c, high: c, low: c, close: c, volume: i === closes.length - 1 ? 50 : 10 }));
    const plan = planTick(input({ desks: [desk("phantom")], bars15m: new Map([["BTC/USD", b15]]), prices: new Map([["BTC/USD", 101.2], ["ETH/USD", 4000], ["SOL/USD", 200]]) }));
    expect(plan.orders.find((o) => o.strategy === "scalp-v1")).toMatchObject({ symbol: "BTC/USD", side: "buy" });
  });
  it("per-strategy comparison: trades, win rate, P/L, max drawdown, avg hold, by lane", () => {
    const t = (strategy: string, pnl: number, hours: number) => ({ desk: "samurai", book: "samurai", symbol: "BTC/USD", entryAt: new Date(NOW - hours * H).toISOString(), exitAt: new Date(NOW).toISOString(), qty: 1, entryPrice: 1, exitPrice: 1, pnl, pnlPct: 1, exitReason: null, strategy });
    const rows = strategyComparison([{ id: "samurai", strategy: "momentum-v1" }], [t("momentum-v1", 10, 2), t("momentum-v1", -4, 4), t("trend-v1", 7, 10)], []);
    const mom = rows.find((r) => r.strategy === "momentum-v1")!;
    expect(mom).toMatchObject({ trades: 2, wins: 1, winRate: 0.5, pnl: 6, maxDrawdown: 4, avgHoldHours: 3 });
    expect(rows.find((r) => r.strategy === "trend-v1")).toMatchObject({ trades: 1, pnl: 7 });
    expect(assetClass("NVDA")).toBe("stock");
  });

  it("per-strategy asset classes come from trades and open positions, else from what the lane can trade", () => {
    const rows = strategyComparison(
      [{ id: "neon", strategy: "dip-v1" }, { id: "orbit", strategy: "swing-v1" }, { id: "ronin", strategy: "custom-v1" }],
      [],
      [{ desk: "neon", symbol: "AMD", strategy: "meanrev-v1" }],
    );
    expect(rows.find((r) => r.strategy === "meanrev-v1")).toMatchObject({ assetClasses: ["stock"], open: 1 });
    expect(rows.find((r) => r.strategy === "dip-v1")!.assetClasses).toEqual(["crypto", "stock"]);
    expect(rows.find((r) => r.strategy === "options-v1")!.assetClasses).toEqual(["option"]);
    expect(rows.find((r) => r.strategy === "custom-v1")!.assetClasses).toEqual(["crypto"]);
  });
});

/** Minimal chainable Supabase stand-in for runTick (records inserts). */
function fakeDb(seed: { desks: DeskRow[] }) {
  const inserted: Record<string, Array<Record<string, unknown>>> = {};
  const paramsRow = { ...params, tick_lease_until: null };
  const client = {
    from(table: string) {
      const state: { op: string; selectArg?: string } = { op: "select" };
      const resolve = () => {
        if (state.op === "insert" || state.op === "delete") return { data: null, error: null };
        if (table === "crypto_floor_params") return state.op === "update" ? { data: state.selectArg ? [{ id: 1 }] : null, error: null } : { data: paramsRow, error: null };
        if (table === "crypto_floor_desks") return { data: seed.desks, error: null };
        return { data: [], error: null, count: 0 };
      };
      const b: Record<string, unknown> = {};
      const chain = new Proxy(b, {
        get(_t, prop: string) {
          if (prop === "then") return (ok: (v: unknown) => void) => ok(resolve());
          if (prop === "maybeSingle" || prop === "single") return async () => resolve();
          if (prop === "insert") return (row: Record<string, unknown> | Array<Record<string, unknown>>) => {
            state.op = "insert";
            const rows = Array.isArray(row) ? row : [row];
            (inserted[table] ??= []).push(...rows.map((r) => (table === "crypto_floor_events" ? { ...r, payload: { ...(r.payload as object), title: r.title ?? (r.payload as { title?: string })?.title } } : r)));
            return chain;
          };
          if (prop === "update" || prop === "delete" || prop === "upsert") return () => { state.op = prop === "upsert" ? "insert" : prop; return chain; };
          if (prop === "select") return (arg?: string) => { if (state.op === "update") state.selectArg = arg; return chain; };
          return () => chain;
        },
      });
      return chain;
    },
  };
  return { client, inserted };
}
