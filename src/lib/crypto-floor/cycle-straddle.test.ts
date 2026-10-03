/**
 * CYCLE desk (cycle-straddle-v1, 2026-10-03): weekly long ATM straddles on a ~3-week cycle.
 * Monday-only entry · per-leg +50% exit · −50% combined exit · day-15 time exit · $500 max debit · max 4 open ·
 * no short opens · desk loss cap · floor-owned reconcile · cycle detector · tick wiring (paper, own account only).
 */
import { describe, expect, it } from "vitest";
import { assertLabCanTest } from "./lab";
import { planLive } from "./live";
import { STRADDLE_MAX_DEBIT_USD, sizeStraddle } from "./risk";
import { STRATEGIES, effectiveParams, validateParams } from "./strategies";
import { strategyComparison } from "./strategyStats";
import { pickStraddle, planTick, type OptionCandidate, type PlanInput } from "./engine";
import { CYCLE_DETECTOR, detectCycle, groupStraddles, isNyMonday, nextEntryMonday, runCycleStraddle, scanCycles, tradingDaysHeld } from "./strategy/cycle-straddle-v1";
import { runTick } from "./tick";
import type { Bar, DeskRow, FloorParamsRow, OrderRow, Position } from "./types";

const H = 3_600_000;
const D = 86_400_000;
const MON = Date.UTC(2026, 9, 5, 15, 5); // Mon Oct 5 2026, 11:05 ET (regular session)
const MON_PRE = Date.UTC(2026, 9, 5, 12, 5); // Mon 08:05 ET (pre-market)
const TUE = MON + D; // Tue 11:05 ET

const params: FloorParamsRow = {
  id: 1, version: 1, halted: false, halt_reason: null, halted_at: null, halted_by: null, halt_day_loss_pct: -2,
  day_paused_until: null, day_pause_reason: null, max_open_positions_total: 12, max_orders_per_tick: 3,
  live_max_total_usd: 100, live_max_trade_usd: 25, live_day_loss_usd: 10, live_paused_until: null, live_pause_reason: null, updated_at: "",
};
const cycleDesk = (over: Partial<DeskRow> = {}): DeskRow => ({ id: "cycle", name: "CYCLE", strategy: "cycle-straddle-v1", enabled: true, capital_usd: 25_000, params: {}, version: 1, paused_until: null, pause_reason: null, live_enabled: false, ...over });

function hourly(symbol: string, price: number, now: number): Bar[] {
  const start = now - 5 * 60_000 - 60 * H;
  return Array.from({ length: 60 }, (_, i) => ({ symbol, timestamp: new Date(start + i * H).toISOString(), open: price, high: price, low: price, close: price, volume: 1000 }));
}
/** 1 year of daily closes: a clean 15-day swing of `amp` (log) around `base`, plus deterministic noise. */
function daily(symbol: string, base: number, amp: number, period = 15, noise = 0.004, n = 252): Bar[] {
  let s = 12345;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32 - 0.5) * 2;
  return Array.from({ length: n }, (_, i) => {
    const c = base * Math.exp(amp * Math.sin((2 * Math.PI * i) / period) + noise * r());
    return { symbol, timestamp: new Date(MON - (n - i) * D).toISOString(), open: c, high: c, low: c, close: c, volume: 1e6 };
  });
}
function randomWalk(seed: number, n = 252, vol = 0.015): Bar[] {
  let s = seed >>> 0;
  const u = () => ((s = (s * 1664525 + 1013904223) >>> 0) + 0.5) / 2 ** 32;
  let lp = Math.log(100);
  return Array.from({ length: n }, (_, i) => {
    lp += vol * Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
    const c = Math.exp(lp);
    return { symbol: "X", timestamp: String(i), open: c, high: c, low: c, close: c, volume: 1 };
  });
}

// F at $12: a 4-week ATM straddle ≈ $111 → 4 contracts ($444). SPY at $660: ≈ $2,150 → above the $500 cap.
const fChain: OptionCandidate[] = [
  { symbol: "F261102C00012000", right: "call", strike: 12, expiration: "2026-11-02", bid: 0.55, ask: 0.58 },
  { symbol: "F261102P00012000", right: "put", strike: 12, expiration: "2026-11-02", bid: 0.5, ask: 0.53 },
  { symbol: "F261102C00013000", right: "call", strike: 13, expiration: "2026-11-02", bid: 0.2, ask: 0.22 },
  { symbol: "F261102P00013000", right: "put", strike: 13, expiration: "2026-11-02", bid: 1.1, ask: 1.14 },
  { symbol: "F261030C00012000", right: "call", strike: 12, expiration: "2026-10-30", bid: 0.5, ask: 0.53 }, // 25 DTE: farther from 28
  { symbol: "F261030P00012000", right: "put", strike: 12, expiration: "2026-10-30", bid: 0.45, ask: 0.48 },
  { symbol: "F261016C00012000", right: "call", strike: 12, expiration: "2026-10-16", bid: 0.3, ask: 0.31 }, // 11 DTE: too short
  { symbol: "F261016P00012000", right: "put", strike: 12, expiration: "2026-10-16", bid: 0.28, ask: 0.29 },
];
const spyChain: OptionCandidate[] = [
  { symbol: "SPY261102C00660000", right: "call", strike: 660, expiration: "2026-11-02", bid: 10.9, ask: 11.0 },
  { symbol: "SPY261102P00660000", right: "put", strike: 660, expiration: "2026-11-02", bid: 10.4, ask: 10.5 },
];
const CALL = "F261102C00012000";
const PUT = "F261102P00012000";

let seq = 0;
function fill(symbol: string, side: "buy" | "sell", qty: number, price: number, at: number): OrderRow {
  seq++;
  const iso = new Date(at).toISOString();
  return { client_order_id: `cf-cycle-straddle-v1-t${seq}`, created_at: iso, book: "cycle", desk: "cycle", strategy: "cycle-straddle-v1", mode: "paper", symbol, side, intent: side === "buy" ? "entry" : "exit", qty, status: "filled", alpaca_order_id: "a", filled_qty: qty, filled_avg_price: price, filled_at: iso, reason: null };
}
const heldStraddle = (at = MON - 3 * D) => [fill(CALL, "buy", 4, 0.58, at), fill(PUT, "buy", 4, 0.53, at)];

function input(over: Partial<PlanInput> = {}): PlanInput {
  const now = over.now ?? MON;
  return {
    now,
    params,
    desks: [cycleDesk()],
    experiments: [],
    universe: [],
    bars: new Map([["SPY", hourly("SPY", 660, now)], ["QQQ", hourly("QQQ", 590, now)], ["F", hourly("F", 12.03, now)]]),
    prices: new Map([["SPY", 660], ["QQQ", 590], ["F", 12.03]]),
    dataStale: false,
    filledOrders: [],
    recentOrders: [],
    baselines: new Map([["cycle", 25_000], ["floor", 25_000]]),
    brokerQty: new Map(),
    buyingPower: 100_000,
    stockUniverse: ["SPY", "QQQ"],
    session: "regular",
    barsDaily: new Map([["F", daily("F", 12, 0.08)]]),
    straddleChains: new Map([["F", fChain], ["SPY", spyChain]]),
    ...over,
  };
}
const buys = (p: ReturnType<typeof planTick>) => p.orders.filter((o) => o.side === "buy");
const sells = (p: ReturnType<typeof planTick>) => p.orders.filter((o) => o.side === "sell");

describe("cycle detector (1y daily bars, ~15-trading-day band)", () => {
  it("finds a real 15-day cycle and reports its period", () => {
    const r = detectCycle("F", daily("F", 12, 0.05));
    expect(r.qualifies).toBe(true);
    expect(r.period).toBeGreaterThanOrEqual(14);
    expect(r.period).toBeLessThanOrEqual(16);
    expect(r.autocorr!).toBeGreaterThan(CYCLE_DETECTOR.minAutocorr);
    expect(r.spectralShare!).toBeGreaterThan(CYCLE_DETECTOR.minSpectralShare);
    expect(r.score).toBeGreaterThan(0);
  });
  it("rejects random walks, other periods and short history", () => {
    let hits = 0;
    for (let s = 1; s <= 400; s++) if (detectCycle("X", randomWalk(s * 7919)).qualifies) hits++;
    expect(hits).toBeLessThanOrEqual(4); // ≤1% false positives
    expect(detectCycle("X", daily("X", 50, 0.05, 30)).qualifies).toBe(false);
    expect(detectCycle("X", daily("X", 50, 0.05, 6)).qualifies).toBe(false);
    const short = detectCycle("X", daily("X", 50, 0.05, 15, 0.004, 120));
    expect(short).toMatchObject({ qualifies: false, period: null, bars: 120, score: 0 });
  });
  it("SPY and QQQ always trade; stocks join only when they qualify (best score first)", () => {
    const scan = scanCycles(new Map([["F", daily("F", 12, 0.05)], ["BAC", randomWalk(99)], ["T", daily("T", 28, 0.08)]]));
    expect(scan.underlyings.slice(0, 2)).toEqual(["SPY", "QQQ"]);
    expect(scan.underlyings).toContain("F");
    expect(scan.underlyings).toContain("T");
    expect(scan.underlyings).not.toContain("BAC");
    expect(scanCycles(new Map()).underlyings).toEqual(["SPY", "QQQ"]);
  });
});

describe("Monday-only entry", () => {
  it("Monday regular session: one ATM straddle — call + put, same strike and ~4-week expiry, both legs or nothing", () => {
    expect(isNyMonday(MON)).toBe(true);
    const plan = planTick(input());
    const b = buys(plan);
    expect(b.map((o) => o.symbol).sort()).toEqual([CALL, PUT].sort());
    expect(b.every((o) => o.qty === 4 && o.intent === "entry" && o.assetClass === "option" && o.orderType === "limit" && o.timeInForce === "day" && !o.extendedHours)).toBe(true);
    expect(b.every((o) => o.clientOrderId.startsWith("cf-cycle-straddle-v1-"))).toBe(true);
    expect(new Set(b.map((o) => o.clientOrderId)).size).toBe(2);
    expect(b[0].straddleDebitUsd).toBeCloseTo(444);
    expect(plan.cycleScan?.underlyings).toContain("F");
    // SPY's straddle is ~$2,150: skipped, with the reason.
    const spy = plan.signals.find((s) => s.signal.symbol === "SPY")!;
    expect(spy.action).toBe("skipped");
    expect(spy.skipReason).toMatch(/above the \$500\.00 max debit per straddle/);
  });
  it("no entry on Tuesday, before the open on Monday, or twice on the same Monday", () => {
    expect(buys(planTick(input({ now: TUE })))).toHaveLength(0);
    expect(planTick(input({ now: TUE })).signals.filter((s) => s.signal.side === "buy")).toHaveLength(0);
    expect(buys(planTick(input({ now: MON_PRE, session: "extended" })))).toHaveLength(0);
    const already: OrderRow = { ...fill(CALL, "buy", 4, 0.58, MON - 30 * 60_000), status: "rejected" as const, filled_qty: 0 };
    expect(buys(planTick(input({ recentOrders: [{ ...already, status: "filled" }] }))).filter((o) => o.symbol.startsWith("F"))).toHaveLength(0);
    for (let day = 0; day < 7; day++) {
      const now = MON + day * D;
      const p = planTick(input({ now }));
      expect(buys(p).length > 0).toBe(day === 0);
    }
  });
  it("the strategy itself only opens on Mondays (New York date)", () => {
    const sun = Date.UTC(2026, 9, 5, 2, 0); // Sun Oct 4, 22:00 ET (already Monday in UTC)
    expect(isNyMonday(sun)).toBe(false);
    expect(runCycleStraddle({ underlyings: ["F"], legTakePct: 50, comboStopPct: -50, timeExitDay: 15, maxOpenStraddles: 4 }, [], [], sun).signals).toHaveLength(0);
    expect(nextEntryMonday(TUE)).toBe("2026-10-12");
    expect(nextEntryMonday(MON)).toBe("2026-10-05");
    expect(nextEntryMonday(Date.UTC(2026, 9, 5, 21, 0))).toBe("2026-10-12"); // Monday after the close
  });
});

describe("exits", () => {
  it("each leg sells on its own at +50%; the other leg rides", () => {
    const prices = new Map([...input().prices, [CALL, 58 * 1.6], [PUT, 53 * 0.6]]); // call +60%, put −40%, combined +12%
    const plan = planTick(input({ now: TUE, filledOrders: heldStraddle(), prices, brokerQty: new Map([[CALL, 4], [PUT, 4]]) }));
    expect(sells(plan).map((o) => [o.symbol, o.qty])).toEqual([[CALL, 4]]);
    expect(sells(plan)[0].reason).toMatch(/Leg target/);
  });
  it("closes the straddle when it is down 50% combined", () => {
    const prices = new Map([...input().prices, [CALL, 58 * 0.45], [PUT, 53 * 0.45]]);
    const plan = planTick(input({ now: TUE, filledOrders: heldStraddle(), prices, brokerQty: new Map([[CALL, 4], [PUT, 4]]) }));
    expect(sells(plan).map((o) => o.symbol).sort()).toEqual([CALL, PUT].sort());
    expect(sells(plan).every((o) => /Straddle stop/.test(o.reason))).toBe(true);
    // −45% combined is not enough
    const p2 = planTick(input({ now: TUE, filledOrders: heldStraddle(), prices: new Map([...input().prices, [CALL, 58 * 0.55], [PUT, 53 * 0.55]]), brokerQty: new Map([[CALL, 4], [PUT, 4]]) }));
    expect(sells(p2)).toHaveLength(0);
  });
  it("hard time exit of every leftover leg on trading day 15, not before", () => {
    const entry15 = Date.UTC(2026, 8, 14, 15, 0); // Mon Sep 14 → Mon Oct 5 is trading day 15
    const entry14 = Date.UTC(2026, 8, 15, 15, 0); // Tue Sep 15 → day 14
    expect(tradingDaysHeld(new Date(entry15).toISOString(), MON)).toBe(15);
    expect(tradingDaysHeld(new Date(entry14).toISOString(), MON)).toBe(14);
    const prices = new Map([...input().prices, [CALL, 58 * 1.1], [PUT, 53 * 0.8]]);
    const due = planTick(input({ filledOrders: heldStraddle(entry15), prices, brokerQty: new Map([[CALL, 4], [PUT, 4]]) }));
    expect(sells(due).map((o) => o.symbol).sort()).toEqual([CALL, PUT].sort());
    expect(sells(due).every((o) => /Day-15 time exit/.test(o.reason))).toBe(true);
    const notYet = planTick(input({ filledOrders: heldStraddle(entry14), prices, brokerQty: new Map([[CALL, 4], [PUT, 4]]) }));
    expect(sells(notYet)).toHaveLength(0);
    // A leg left over after the other one took profit is also time-exited.
    const leftover = planTick(input({ filledOrders: [...heldStraddle(entry15), fill(CALL, "sell", 4, 0.9, entry15 + 2 * D)], prices, brokerQty: new Map([[PUT, 4]]) }));
    expect(sells(leftover).map((o) => o.symbol)).toEqual([PUT]);
  });
  it("groups legs into straddles for the desk card", () => {
    const pos: Position[] = [
      { symbol: CALL, qty: 4, avgEntryPrice: 58, currentPrice: 70, unrealizedPnl: 48, unrealizedPnlPct: 20.7, enteredAt: new Date(MON - 3 * D).toISOString(), strategy: "cycle-straddle-v1" },
      { symbol: PUT, qty: 4, avgEntryPrice: 53, currentPrice: 40, unrealizedPnl: -52, unrealizedPnlPct: -24.5, enteredAt: new Date(MON - 3 * D).toISOString(), strategy: "cycle-straddle-v1" },
    ];
    const [s] = groupStraddles(pos, MON);
    expect(s).toMatchObject({ underlying: "F", strike: 12, expiration: "2026-11-02", cost: 444, value: 440 });
    expect(s.legs.map((l) => l.right)).toEqual(["call", "put"]);
    expect(s.pnlPct).toBeCloseTo(-0.9, 1);
  });
});

describe("$500 max debit per straddle, max 4 open", () => {
  it("sizing never exceeds $500 for any pair of premiums", () => {
    for (let c = 0.05; c < 8; c += 0.13) {
      for (let p = 0.05; p < 8; p += 0.29) {
        const s = sizeStraddle(c, p);
        if (!s.ok) {
          expect((c + p) * 100).toBeGreaterThan(STRADDLE_MAX_DEBIT_USD - 2); // only refuses when one straddle is over the cap
          continue;
        }
        expect(Number.isInteger(s.qty)).toBe(true);
        expect(s.qty).toBeGreaterThanOrEqual(1);
        expect(s.callLimit).toBeGreaterThanOrEqual(c - 1e-9);
        expect(s.putLimit).toBeGreaterThanOrEqual(p - 1e-9);
        expect(s.debitUsd).toBeCloseTo((s.callLimit + s.putLimit) * 100 * s.qty);
        expect(s.debitUsd).toBeLessThanOrEqual(STRADDLE_MAX_DEBIT_USD + 1e-6);
      }
    }
    expect(sizeStraddle(3, 2.5).ok).toBe(false); // $550 for one
    expect(sizeStraddle(0.58, 0.53, 300)).toMatchObject({ ok: true, qty: 2 }); // buying power binds below the cap
  });
  it("planned legs together never exceed $500, whatever the chain", () => {
    for (const k of [0.5, 1, 2, 2.4, 3]) {
      const chain = fChain.map((c) => ({ ...c, bid: c.bid * k, ask: c.ask * k }));
      const p = planTick(input({ straddleChains: new Map([["F", chain]]) }));
      const debit = buys(p).reduce((s, o) => s + o.limitPrice! * 100 * o.qty, 0);
      expect(debit).toBeLessThanOrEqual(STRADDLE_MAX_DEBIT_USD + 1e-6);
      expect(buys(p).length === 0 || buys(p).length === 2).toBe(true);
    }
    // The cap is code, not a param: no param can raise it and the lab/agents can't write one.
    expect(validateParams("cycle-straddle-v1", { maxDebitUsd: 5000 }).ok).toBe(false);
    expect(validateParams("cycle-straddle-v1", { maxOpenStraddles: 6 }).ok).toBe(false);
    expect(validateParams("cycle-straddle-v1", { timeExitDay: 20 }).ok).toBe(false);
    expect(validateParams("cycle-straddle-v1", { comboStopPct: -80 }).ok).toBe(false);
    expect(effectiveParams("cycle-straddle-v1", { maxOpenStraddles: 9 }).maxOpenStraddles).toBe(4);
  });
  it("max 4 straddles open at once", () => {
    const others = ["BAC", "T", "PFE", "INTC"].map((u) => [fill(`${u}261102C00030000`, "buy", 1, 1, MON - 3 * D), fill(`${u}261102P00030000`, "buy", 1, 1, MON - 3 * D)]);
    const broker = new Map(others.flat().map((o) => [o.symbol, 1])); // the broker backs every leg (no reconcile)
    const four = planTick(input({ filledOrders: others.flat(), brokerQty: broker }));
    expect(four.desks[0].marked.positions).toHaveLength(8);
    expect(buys(four)).toHaveLength(0);
    const three = planTick(input({ filledOrders: others.slice(0, 3).flat(), brokerQty: broker }));
    expect(buys(three).map((o) => o.symbol).sort()).toEqual([CALL, PUT].sort()); // SPY (over the cap) doesn't use up the room
    // Two affordable underlyings, room for one: only the first in priority order opens; the second is skipped.
    const aChain = fChain.map((c) => ({ ...c, symbol: c.symbol.replace(/^F/, "AAL") }));
    const two = planTick(input({
      filledOrders: others.slice(0, 3).flat(), brokerQty: broker,
      bars: new Map([...input().bars, ["AAL", hourly("AAL", 12.03, MON)]]), prices: new Map([...input().prices, ["AAL", 12.03]]),
      barsDaily: new Map([["F", daily("F", 12, 0.08)], ["AAL", daily("AAL", 12, 0.05)]]),
      straddleChains: new Map([["F", fChain], ["AAL", aChain]]),
    }));
    expect(buys(two)).toHaveLength(2);
    expect(two.signals.find((x) => x.signal.side === "buy" && x.action === "skipped" && /straddles open/.test(x.skipReason ?? ""))).toBeDefined();
  });
});

describe("long premium only — never sells to open", () => {
  it("sells only legs the desk holds, capped at ledger AND broker; every buy is a sized straddle leg", () => {
    // Broker shows more than the desk holds (and a foreign option): sells stay at the desk's 4, foreign never sold.
    const prices = new Map([...input().prices, [CALL, 58 * 1.6], [PUT, 53]]);
    const p = planTick(input({ now: TUE, filledOrders: heldStraddle(), prices, brokerQty: new Map([[CALL, 9], [PUT, 9], ["AAPL261023C00340000", 5]]) }));
    expect(sells(p)).toEqual([expect.objectContaining({ symbol: CALL, qty: 4 })]);
    // Nothing held → no sell at all, whatever the broker holds.
    const none = planTick(input({ now: TUE, brokerQty: new Map([[CALL, 9], ["AAPL261023C00340000", 5]]) }));
    expect(sells(none)).toHaveLength(0);
  });
  it("fuzz: random premiums, ages and broker holdings never produce a short open", () => {
    let s = 7;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 300; i++) {
      const held = rnd() < 0.7;
      const at = MON - Math.floor(rnd() * 25) * D;
      const filled = held ? heldStraddle(at) : [];
      const prices = new Map([...input().prices, [CALL, 58 * rnd() * 3], [PUT, 53 * rnd() * 3]]);
      const broker = new Map([[CALL, Math.floor(rnd() * 8)], [PUT, Math.floor(rnd() * 8)]]);
      const now = rnd() < 0.5 ? MON : TUE + Math.floor(rnd() * 3) * D;
      const plan = planTick(input({ now, filledOrders: filled, prices, brokerQty: broker }));
      for (const o of plan.orders) {
        if (o.side === "sell") {
          expect(held).toBe(true);
          expect([CALL, PUT]).toContain(o.symbol);
          expect(o.intent).toBe("exit");
          expect(o.qty).toBeLessThanOrEqual(Math.min(4, broker.get(o.symbol) ?? 0));
        } else {
          expect(o.intent).toBe("entry");
          expect(o.assetClass).toBe("option");
          expect(o.straddleDebitUsd!).toBeLessThanOrEqual(STRADDLE_MAX_DEBIT_USD);
        }
      }
      for (const sig of plan.signals) if (sig.signal.side === "sell") expect(filled.some((f) => f.symbol === sig.signal.symbol)).toBe(true);
    }
  });
});

describe("desk loss cap and floor-owned reconcile", () => {
  it("at the desk's daily loss cap: no new straddle, exits still run", () => {
    const prices = new Map([...input().prices, [CALL, 58 * 1.6], [PUT, 53]]);
    const capped = planTick(input({ filledOrders: heldStraddle(), prices, brokerQty: new Map([[CALL, 4], [PUT, 4]]), baselines: new Map([["cycle", 26_500], ["floor", 26_500]]) }));
    expect(capped.desks[0].atLossCap).toBe(true);
    expect(buys(capped)).toHaveLength(0);
    expect(sells(capped).map((o) => o.symbol)).toEqual([CALL]);
  });
  it("a leg the broker no longer holds is cleared in the ledger (rc-), never sold", () => {
    const plan = planTick(input({ now: TUE, filledOrders: heldStraddle(MON - 3 * D), brokerQty: new Map([[PUT, 4]]) }));
    expect(plan.reconcile.map((a) => [a.book, a.symbol, a.brokerQty])).toEqual([["cycle", CALL, 0]]);
    expect(plan.reconcileRows[0].client_order_id.startsWith("rc-cycle-")).toBe(true);
    expect(plan.orders.some((o) => o.symbol === CALL)).toBe(false);
    // Non-floor (non cf-/rc-) orders never enter CYCLE's book.
    const foreign = { ...fill(CALL, "buy", 4, 0.58, MON - 3 * D), client_order_id: "awadbot-123" };
    expect(planTick(input({ now: TUE, filledOrders: [foreign] })).desks[0].marked.positions).toHaveLength(0);
  });
});

describe("wiring", () => {
  it("picks the ATM strike at the expiry closest to 28 DTE", () => {
    expect(pickStraddle(fChain, 12.03, MON)).toMatchObject({ call: { symbol: CALL }, put: { symbol: PUT } });
    expect(pickStraddle(fChain, 12.9, MON)?.call.strike).toBe(13);
    expect(pickStraddle(fChain.filter((c) => c.symbol !== PUT && c.expiration === "2026-11-02" && c.strike === 12), 12, MON)).toBeNull(); // no matching put
  });
  it("registry, desk, results lane, lab and real money", () => {
    expect(STRATEGIES["cycle-straddle-v1"]).toMatchObject({ desk: "cycle", defaults: { legTakePct: 50, comboStopPct: -50, timeExitDay: 15, maxOpenStraddles: 4 } });
    const rows = strategyComparison([{ id: "cycle", strategy: "cycle-straddle-v1" }], [], []);
    expect(rows).toEqual([expect.objectContaining({ strategy: "cycle-straddle-v1", desk: "cycle", assetClasses: ["option"], trades: 0, open: 0 })]);
    expect(() => assertLabCanTest(cycleDesk())).toThrow(/cannot backtest/);
    const live = planLive({ now: MON, params, desks: [cycleDesk({ live_enabled: true })], universe: ["BTC/USD"], bars: new Map(), prices: new Map(), dataStale: false, filledOrders: [], recentOrders: [], baselines: new Map([["live", 0]]), coinbase: { configured: true, ok: true, error: null, canView: true, canTrade: true, canTransfer: false, usdAvailable: 500, coins: new Map(), prices: new Map(), products: new Map() } });
    expect(live.orders).toHaveLength(0);
  });

  it("tick on a Monday (own paper account): daily bars → screen → chains → both legs sent as cf- limit orders; heartbeat carries the screen", async () => {
    const db = fakeDb({ desks: [cycleDesk()] });
    const submitted: Array<Record<string, unknown>> = [];
    const chainCalls: string[] = [];
    const alpaca = {
      dedicated: true,
      account: async () => ({ cash: "100000", equity: "100000", portfolio_value: "100000", non_marginable_buying_power: "100000" }),
      positions: async () => [],
      clock: async () => ({ is_open: true }),
      listedPairs: async () => [],
      cryptoAssets: async () => new Map(),
      bars: async () => new Map(),
      latestTrades: async () => new Map(),
      stockBars: async (syms: string[], _start: Date, tf?: string) =>
        new Map(syms.map((s) => [s, tf === "1Day" ? (s === "F" ? daily("F", 12, 0.08) : []) : hourly(s, s === "F" ? 12.03 : s === "SPY" ? 660 : 100, MON)])),
      latestStockTrades: async (syms: string[]) => new Map(syms.map((s) => [s, { price: s === "F" ? 12.03 : s === "SPY" ? 660 : 100, at: new Date(MON - 60_000).toISOString() }])),
      optionSnapshots: async () => new Map(),
      optionChain: async (u: string) => {
        chainCalls.push(u);
        return (u === "F" ? fChain : u === "SPY" ? spyChain : []).map((c) => ({ symbol: c.symbol, bid: c.bid, ask: c.ask, mid: (c.bid + c.ask) / 2 }));
      },
      submitOrder: async (o: Record<string, unknown>) => {
        submitted.push(o);
        return { id: `al-${submitted.length}`, status: "accepted", filled_qty: "0", filled_avg_price: null, filled_at: null };
      },
      orderByClientId: async () => null,
    };
    const r = await runTick({ db: db.client as never, alpaca: alpaca as never, coinbase: null, tradeMode: "paper", now: () => MON, sleep: async () => {} });
    expect(r.ok).toBe(true);
    expect(chainCalls).toContain("F");
    expect(submitted.map((o) => o.symbol).sort()).toEqual([CALL, PUT].sort());
    expect(submitted.every((o) => o.side === "buy" && o.type === "limit" && o.timeInForce === "day" && String(o.clientOrderId).startsWith("cf-cycle-straddle-v1-"))).toBe(true);
    const hb = (db.inserted.crypto_floor_events ?? []).find((e) => e.type === "heartbeat") as { payload: { cycleScan: { underlyings: string[]; reads: unknown[] } } };
    expect(hb.payload.cycleScan.underlyings).toEqual(expect.arrayContaining(["SPY", "QQQ", "F"]));
    expect(hb.payload.cycleScan.reads.length).toBeGreaterThan(2);

    // Tuesday: no chains fetched, nothing bought.
    chainCalls.length = 0;
    submitted.length = 0;
    await runTick({ db: fakeDb({ desks: [cycleDesk()] }).client as never, alpaca: alpaca as never, coinbase: null, tradeMode: "paper", now: () => TUE, sleep: async () => {} });
    expect(chainCalls).toHaveLength(0);
    expect(submitted).toHaveLength(0);
  });
});

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
      const chain: Record<string, unknown> = new Proxy({}, {
        get(_t, prop: string) {
          if (prop === "then") return (ok: (v: unknown) => void) => ok(resolve());
          if (prop === "maybeSingle" || prop === "single") return async () => resolve();
          if (prop === "insert") return (row: Record<string, unknown> | Array<Record<string, unknown>>) => {
            state.op = "insert";
            const rows = Array.isArray(row) ? row : [row];
            (inserted[table] ??= []).push(...rows);
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
