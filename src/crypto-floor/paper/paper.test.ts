import { describe, expect, it, vi } from "vitest";
import { sampleSnapshot } from "../sample";
import { snapshotSchema } from "../model";
import { ALPACA_PAPER_ORIGIN, assertAlpacaPaperBase, assertPaperMode } from "./guard";
import { deskForMethod } from "./desks";
import { fifoPnl, openCountsFromState, parseTradesCsv } from "./journal";
import { alpacaPaperOrderBody, submitDeskPaperOrder, type PaperBroker } from "./order";
import { describeFloorStatus, loadPaperBook, type PaperEnv } from "./load";
import { buildPaperSnapshot, type PaperBook } from "./snapshot";
import { paperTradablePairs } from "./universe";
import { GET as floorStatus } from "@/app/api/floor-status/route";
import { GET as floorSnapshot } from "@/app/api/floor-snapshot/route";

const now = "2026-09-21T16:00:00.000Z";

function env(partial: Partial<PaperEnv> = {}): PaperEnv {
  return {
    mode: "paper",
    key: "key",
    secret: "secret",
    paperBase: ALPACA_PAPER_ORIGIN,
    statusUrl: null,
    dashboardPassword: null,
    journalDir: null,
    ...partial,
  };
}

function book(partial: Partial<PaperBook> = {}): PaperBook {
  return {
    now,
    account: {
      equity: 100000,
      lastEquity: 99840,
      portfolioValue: 100000,
      cash: 50000,
      status: "ACTIVE",
      cryptoStatus: "ACTIVE",
    },
    positions: [],
    orders: [],
    quotes: [
      {
        symbol: "BTC/USD",
        price: 64000,
        changePct: 1.25,
        timestamp: now,
      },
    ],
    trades: [],
    signals: [],
    ignoredLiveRows: 0,
    openByDesk: null,
    latencyMs: 12,
    heartbeat: now,
    heartbeatSource: "Alpaca paper clock",
    halt: { halted: false, reason: null },
    sources: { alpaca: true, dashboard: false, journal: true },
    alpacaError: null,
    dashboardError: null,
    journalError: null,
    ...partial,
  };
}

const csv = [
  "timestamp,mode,action,symbol,qty,price,notional,reason,method,sim",
  "2026-09-21T15:00:00Z,paper,buy,BTC/USD,0.01,64000,640,ema cross,trend_ema,true",
  "2026-09-21T15:05:00Z,paper,sell,BTC/USD,0.01,64500,645,target,trend_ema,true",
  "2026-09-21T15:10:00Z,paper,buy,ETH/USD,0.2,3200,640,stretch,mean_reversion,false",
  "2026-09-21T15:11:00Z,paper,buy,SOL/USD,2,150,300,break,momentum_breakout,true",
  "2026-09-21T15:12:00Z,paper,sell,DOGE/USD,100,0.1,10,scalp,scalp_momentum,true",
  "2026-09-21T15:13:00Z,live,buy,BTC/USD,1,64000,64000,live attempt,trend_ema,false",
  "2026-09-21T15:14:00Z,paper,buy,BTC/USD,0.01,64100,641,fast scalp,paper_scalp,true",
].join("\n");

describe("Alpaca paper guard", () => {
  it("refuses live Alpaca origins and non-paper mode", () => {
    expect(() => assertAlpacaPaperBase("https://api.alpaca.markets")).toThrow(/Refusing/);
    expect(() => assertAlpacaPaperBase("https://broker-api.alpaca.markets/v2")).toThrow(/Refusing/);
    expect(() => assertAlpacaPaperBase("https://paper-api.alpaca.markets.evil.com")).toThrow(
      /Refusing/,
    );
    expect(() => assertAlpacaPaperBase("http://paper-api.alpaca.markets")).toThrow(/https/);
    expect(assertAlpacaPaperBase("https://paper-api.alpaca.markets/v2/orders")).toBe(
      ALPACA_PAPER_ORIGIN,
    );
    expect(() => assertPaperMode("live")).toThrow(/paper/);
    expect(() => assertPaperMode("")).toThrow(/paper/);
  });

  it("does not call the network when the base URL is live", async () => {
    const fetcher = vi.fn();
    const loaded = await loadPaperBook(
      env({ paperBase: "https://api.alpaca.markets", journalDir: null }),
      { fetch: fetcher, now },
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(loaded.sources.alpaca).toBe(false);
    expect(loaded.alpacaError).toMatch(/Refusing/);
    const status = describeFloorStatus(
      env({ paperBase: "https://api.alpaca.markets" }),
      loaded,
    );
    expect(status.liveTrading).toBe(false);
    expect(status.ordersSubmittedByCommand).toBe(false);
    expect(status.engine).not.toBe("TRADING");
  });
});

describe("shared paper book snapshot", () => {
  it("keeps sample fixtures out of the paper snapshot", () => {
    const parsed = parseTradesCsv(csv);
    const snap = buildPaperSnapshot(
      book({
        trades: parsed.trades,
        ignoredLiveRows: parsed.ignoredLiveRows,
      }),
    );
    const sample = sampleSnapshot();
    expect(snapshotSchema.safeParse(snap).success).toBe(true);
    expect(snap.engine).toBe("ONLINE");
    expect(snap.source).toBe("AwadBot shared Alpaca paper book");
    expect(snap.portfolio.paperBalance).toBe(100000);
    expect(snap.portfolio.liveBalance).toBeNull();
    expect(snap.portfolio.paperBalance).not.toBe(sample.portfolio.paperBalance);
    expect(snap.events.every((event) => !event.id.startsWith("sample"))).toBe(true);
    expect(snap.markets.map((m) => m.price)).not.toContain(56420.13);
    expect(sample.engine).toBe("OFFLINE");
    expect(sample.source).toMatch(/fixture/i);
  });

  it("labels sim curriculum fills and does not invent broker fills for open orders", () => {
    const parsed = parseTradesCsv(csv);
    expect(parsed.ignoredLiveRows).toBe(1);
    const snap = buildPaperSnapshot(
      book({
        trades: parsed.trades,
        ignoredLiveRows: parsed.ignoredLiveRows,
        orders: [
          {
            id: "open-1",
            symbol: "BTC/USD",
            side: "buy",
            status: "new",
            submittedAt: "2026-09-21T15:30:00.000Z",
            filledAt: null,
            filledAvgPrice: null,
            filledQty: null,
            notional: 25,
            clientOrderId: "trend_ema-btc",
          },
        ],
      }),
    );
    const sim = snap.events.filter((event) => event.payload.sim === true);
    expect(sim.length).toBeGreaterThan(0);
    expect(sim.every((event) => event.description.includes("not a broker cash fill"))).toBe(
      true,
    );
    expect(snap.events.some((event) => event.description.includes("live attempt"))).toBe(false);
    const open = snap.events.find((event) => event.orderId === "open-1");
    expect(open?.eventType).toBe("ORDER_ACCEPTED");
    expect(open?.teamId).toBe("samurai");
    expect(snap.events.filter((event) => event.orderId === "open-1" && event.eventType === "ORDER_FILLED")).toEqual([]);
    expect(snap.teams.find((team) => team.id === "samurai")?.pnl).toBeCloseTo(5, 5);
    expect(deskForMethod("paper_scalp")).toBe("phantom");
    expect(snap.events.some((event) => event.teamId === "phantom")).toBe(true);
    expect(snap.events.some((event) => event.teamId === "neon" && event.payload.brokerSettled === true)).toBe(true);
    expect(snap.events.some((event) => event.teamId === "orbit")).toBe(true);
  });

  it("counts sleeve positions without treating quantity fields as symbols", () => {
    const counts = openCountsFromState({
      trend_ema: { "BTC/USD": { qty: 0.01 } },
      scalp_momentum: { "DOGE/USD": 100 },
      mean_reversion: { cash: 10 },
    });
    expect(counts.samurai).toBe(1);
    expect(counts.phantom).toBe(1);
    expect(counts.neon).toBe(0);
  });
});

describe("deterministic paper order path", () => {
  it("submits buy and sell for each desk only through a paper broker", async () => {
    const calls: string[] = [];
    const broker: PaperBroker = {
      baseUrl: ALPACA_PAPER_ORIGIN,
      async submit(order) {
        calls.push(`${order.deskId}:${order.method}:${order.side}:${order.symbol}`);
        expect(alpacaPaperOrderBody(order).time_in_force).toBe("gtc");
        return { id: `ack-${order.deskId}-${order.side}`, status: "accepted", symbol: order.symbol, side: order.side };
      },
    };
    for (const deskId of ["samurai", "neon", "orbit", "phantom"] as const) {
      await submitDeskPaperOrder(
        { deskId, side: "buy", symbol: "btc-usd", notional: 25 },
        broker,
        { mode: "paper", execution: "submit" },
      );
      await submitDeskPaperOrder(
        { deskId, side: "sell", symbol: "BTC/USD", notional: 25 },
        broker,
        { mode: "paper", execution: "submit" },
      );
    }
    expect(calls).toEqual([
      "samurai:trend_ema:buy:BTC/USD",
      "samurai:trend_ema:sell:BTC/USD",
      "neon:mean_reversion:buy:BTC/USD",
      "neon:mean_reversion:sell:BTC/USD",
      "orbit:momentum_breakout:buy:BTC/USD",
      "orbit:momentum_breakout:sell:BTC/USD",
      "phantom:scalp_momentum:buy:BTC/USD",
      "phantom:scalp_momentum:sell:BTC/USD",
    ]);
    await expect(
      submitDeskPaperOrder(
        { deskId: "samurai", side: "buy", symbol: "BTC/USD", notional: 25 },
        broker,
        { mode: "paper", execution: "observe" },
      ),
    ).rejects.toThrow(/observe-only/);
    await expect(
      submitDeskPaperOrder(
        { deskId: "samurai", side: "buy", symbol: "BTC/USD", notional: 25 },
        { ...broker, baseUrl: "https://api.alpaca.markets" },
        { mode: "paper", execution: "submit" },
      ),
    ).rejects.toThrow(/Refusing/);
    expect(fifoPnl(parseTradesCsv(csv).trades, new Map([["BTC", 64000]])).realized).toBeCloseTo(5);
  });

  it("trades XRP/USD on paper and never sends an XLM order", async () => {
    expect(paperTradablePairs).toContain("XRP/USD");
    expect(paperTradablePairs).not.toContain("XLM/USD");
    const calls: string[] = [];
    const broker: PaperBroker = {
      baseUrl: ALPACA_PAPER_ORIGIN,
      async submit(order) {
        calls.push(`${order.side}:${order.symbol}`);
        return {
          id: `ack-${order.side}`,
          status: "accepted",
          symbol: order.symbol,
          side: order.side,
        };
      },
    };
    await submitDeskPaperOrder(
      { deskId: "samurai", side: "buy", symbol: "XRP/USD", notional: 25 },
      broker,
      { mode: "paper", execution: "submit" },
    );
    await submitDeskPaperOrder(
      { deskId: "phantom", side: "sell", symbol: "xrp-usd", notional: 25 },
      broker,
      { mode: "paper", execution: "submit" },
    );
    expect(calls).toEqual(["buy:XRP/USD", "sell:XRP/USD"]);
    await expect(
      submitDeskPaperOrder(
        { deskId: "neon", side: "buy", symbol: "XLM/USD", notional: 25 },
        broker,
        { mode: "paper", execution: "submit" },
      ),
    ).rejects.toThrow(/not Alpaca-listed/);
    expect(calls).toEqual(["buy:XRP/USD", "sell:XRP/USD"]);
    const snap = buildPaperSnapshot(
      book({
        trades: [
          {
            timestamp: now,
            mode: "paper",
            action: "buy",
            symbol: "XLM/USD",
            qty: 10,
            price: 0.2,
            notional: 2,
            reason: "coil",
            method: "scalp_momentum",
            sim: false,
          },
          {
            timestamp: now,
            mode: "paper",
            action: "buy",
            symbol: "XRP/USD",
            qty: 20,
            price: 1.48,
            notional: 29.6,
            reason: "decision zone",
            method: "trend_ema",
            sim: false,
          },
        ],
        quotes: [
          {
            symbol: "XRP/USD",
            price: 1.48,
            changePct: 0.4,
            timestamp: now,
          },
          {
            symbol: "XLM/USD",
            price: 0.2,
            changePct: 0,
            timestamp: now,
          },
        ],
      }),
    );
    expect(snap.events.some((event) => event.symbol === "XLM")).toBe(false);
    expect(snap.events.some((event) => event.symbol === "XRP" && event.eventType === "ORDER_FILLED")).toBe(true);
    expect(snap.markets.map((market) => market.symbol)).toEqual(["XRP"]);
    expect(snap.markets.some((market) => market.symbol === "XLM")).toBe(false);
  });
});

describe("floor status", () => {
  it("reports trading from the shared book without claiming command orders", () => {
    const parsed = parseTradesCsv(csv);
    const status = describeFloorStatus(
      env(),
      book({ trades: parsed.trades, ignoredLiveRows: parsed.ignoredLiveRows }),
    );
    expect(status.engine).toBe("TRADING");
    expect(status.venue).toBe("alpaca-paper");
    expect(status.liveTrading).toBe(false);
    expect(status.ordersSubmittedByCommand).toBe(false);
    expect(status.killSwitch).toBe("disabled");
    expect(status.simJournalFills).toBeGreaterThan(0);
    expect(status.heartbeat).toBe(now);
    expect(status.coinbaseVenue).toBe("deferred");
    expect(status.note).toMatch(/Coinbase is deferred/);
    expect(status.note).toMatch(/not required to leave sample mode/);
    expect(status.note).toMatch(/sim=true/);
    expect(status.desks).toEqual({
      samurai: "trend_ema",
      neon: "mean_reversion",
      orbit: "momentum_breakout",
      phantom: "scalp_momentum",
    });
  });

  it("reads Alpaca paper JSON and stays offline without paper mode", async () => {
    const urls: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      expect(url.startsWith(ALPACA_PAPER_ORIGIN) || url.startsWith("https://data.alpaca.markets")).toBe(
        true,
      );
      if (url.includes("/v2/account")) {
        return Response.json({ equity: "100000", last_equity: "99000", status: "ACTIVE", crypto_status: "ACTIVE" });
      }
      if (url.includes("/v2/positions")) return Response.json([]);
      if (url.includes("/v2/orders")) return Response.json([]);
      if (url.includes("/v2/clock")) return Response.json({ timestamp: now, is_open: false });
      if (url.includes("snapshots")) {
        return Response.json({
          snapshots: {
            "BTC/USD": {
              latestTrade: { p: "64000", t: now },
              prevDailyBar: { c: "63000" },
            },
          },
        });
      }
      return new Response("no", { status: 404 });
    });
    const loaded = await loadPaperBook(env(), { fetch: fetcher, now });
    expect(loaded.sources.alpaca).toBe(true);
    expect(loaded.account?.equity).toBe(100000);
    expect(loaded.quotes[0]?.price).toBe(64000);
    const snap = buildPaperSnapshot(loaded);
    expect(snap.portfolio.paperPnl).toBe(1000);
    expect(snap.markets[0]?.symbol).toBe("BTC");
    expect(snap.events).toEqual([]);
    const quoteUrl = urls.find((url) => url.includes("snapshots")) ?? "";
    expect(quoteUrl).toContain("XRP");
    expect(quoteUrl).not.toContain("XLM");
    const refused = await loadPaperBook(env({ mode: "live" }), { fetch: fetcher, now });
    expect(refused.sources.alpaca).toBe(false);
    expect(
      describeFloorStatus(env({ mode: "live", key: null, secret: null }), refused).liveTrading,
    ).toBe(false);
  });

  it("serves an offline paper status without sample fixtures when keys are absent", async () => {
    const names = [
      "TRADE_MODE",
      "ALPACA_API_KEY",
      "ALPACA_SECRET_KEY",
      "APCA_API_KEY_ID",
      "APCA_API_SECRET_KEY",
      "AWADBOT_JOURNAL_DIR",
      "AWADBOT_STATUS_URL",
      "DASHBOARD_PASSWORD",
    ];
    const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    for (const name of names) delete process.env[name];
    try {
      const status = await (await floorStatus()).json();
      expect(status.liveTrading).toBe(false);
      expect(status.ordersSubmittedByCommand).toBe(false);
      expect(status.venue).toBe("alpaca-paper");
      expect(status.killSwitch).toBe("disabled");
      expect(status.engine).toBe("OFFLINE");
      const body = await (await floorSnapshot()).json();
      expect(body.snapshot.source).not.toMatch(/fixture|sample/i);
      expect(body.snapshot.portfolio.paperBalance).toBeNull();
      expect(body.snapshot.events).toEqual([]);
      expect(body.snapshot.markets).toEqual([]);
      expect(body.status.liveTrading).toBe(false);
    } finally {
      for (const name of names) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    }
  });
});
