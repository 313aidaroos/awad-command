import { describe, expect, it } from "vitest";
import { buildBooks, markBook, tradeStats } from "./ledger";
import type { OrderRow } from "./types";

let seq = 0;
function fill(p: Partial<OrderRow> & Pick<OrderRow, "book" | "symbol" | "side" | "filled_qty" | "filled_avg_price">): OrderRow {
  seq++;
  const at = p.filled_at ?? new Date(Date.UTC(2026, 9, 1, 0, seq)).toISOString();
  return {
    client_order_id: `o${seq}`,
    created_at: at,
    desk: p.book,
    strategy: null,
    mode: "paper",
    intent: p.side === "buy" ? "entry" : "exit",
    qty: p.filled_qty,
    status: "filled",
    alpaca_order_id: null,
    filled_at: at,
    reason: null,
    ...p,
  };
}

describe("ledger", () => {
  it("keeps each desk's coins separate even on the same symbol", () => {
    const books = buildBooks([
      fill({ book: "samurai", symbol: "BTC/USD", side: "buy", filled_qty: 0.01, filled_avg_price: 100_000 }),
      fill({ book: "neon", symbol: "BTC/USD", side: "buy", filled_qty: 0.02, filled_avg_price: 90_000 }),
    ]);
    expect(books.get("samurai")!.positions.get("BTC/USD")!.qty).toBeCloseTo(0.01);
    expect(books.get("neon")!.positions.get("BTC/USD")!.avgEntryPrice).toBe(90_000);
  });

  it("average-costs scale-ins and counts tranches", () => {
    const books = buildBooks([
      fill({ book: "neon", symbol: "ETH/USD", side: "buy", filled_qty: 1, filled_avg_price: 4000 }),
      fill({ book: "neon", symbol: "ETH/USD", side: "buy", filled_qty: 1, filled_avg_price: 3600 }),
    ]);
    const pos = books.get("neon")!.positions.get("ETH/USD")!;
    expect(pos.qty).toBe(2);
    expect(pos.avgEntryPrice).toBe(3800);
    expect(pos.tranches).toBe(2);
  });

  it("realizes P&L on a round trip and records the closed trade", () => {
    const books = buildBooks([
      fill({ book: "samurai", symbol: "SOL/USD", side: "buy", filled_qty: 10, filled_avg_price: 100 }),
      fill({ book: "samurai", symbol: "SOL/USD", side: "sell", filled_qty: 10, filled_avg_price: 103, reason: "Take profit" }),
    ]);
    const b = books.get("samurai")!;
    expect(b.positions.size).toBe(0);
    expect(b.realizedPnl).toBeCloseTo(30);
    expect(b.closedTrades).toHaveLength(1);
    expect(b.closedTrades[0].pnlPct).toBeCloseTo(3);
    expect(b.closedTrades[0].exitReason).toBe("Take profit");
  });

  it("closes a position whose fee-sized remainder is dust and writes the dust off", () => {
    const books = buildBooks([
      fill({ book: "samurai", symbol: "BTC/USD", side: "buy", filled_qty: 0.01, filled_avg_price: 100_000 }),
      // Alpaca took its 0.25% fee in BTC: only 0.009975 could be sold. $2.50 left = 0.25% of cost → closed.
      fill({ book: "samurai", symbol: "BTC/USD", side: "sell", filled_qty: 0.009975, filled_avg_price: 100_000 }),
    ]);
    const b = books.get("samurai")!;
    expect(b.positions.size).toBe(0);
    expect(b.realizedPnl).toBeCloseTo(-2.5);
    expect(b.closedTrades).toHaveLength(1);
  });

  it("keeps a real partial sell open", () => {
    const books = buildBooks([
      fill({ book: "x", symbol: "BTC/USD", side: "buy", filled_qty: 0.01, filled_avg_price: 100_000 }),
      fill({ book: "x", symbol: "BTC/USD", side: "sell", filled_qty: 0.005, filled_avg_price: 101_000 }),
    ]);
    const b = books.get("x")!;
    expect(b.positions.get("BTC/USD")!.qty).toBeCloseTo(0.005);
    expect(b.realizedPnl).toBeCloseTo(5);
    expect(b.closedTrades).toHaveLength(0);
  });

  it("ignores sells with no position in that book (e.g. manual sell of an old coin)", () => {
    const books = buildBooks([fill({ book: "manual", symbol: "BTC/USD", side: "sell", filled_qty: 1, filled_avg_price: 1 })]);
    expect(books.get("manual")!.realizedPnl).toBe(0);
  });

  it("marks to market", () => {
    const books = buildBooks([fill({ book: "orbit", symbol: "ETH/USD", side: "buy", filled_qty: 2, filled_avg_price: 4000 })]);
    const m = markBook(books.get("orbit")!, 25_000, new Map([["ETH/USD", 4100]]));
    expect(m.unrealizedPnl).toBeCloseTo(200);
    expect(m.equity).toBeCloseTo(25_200);
    expect(m.positions[0].unrealizedPnlPct).toBeCloseTo(2.5);
  });

  it("computes trade stats", () => {
    const books = buildBooks([
      fill({ book: "a", symbol: "SOL/USD", side: "buy", filled_qty: 1, filled_avg_price: 100 }),
      fill({ book: "a", symbol: "SOL/USD", side: "sell", filled_qty: 1, filled_avg_price: 110 }),
      fill({ book: "a", symbol: "SOL/USD", side: "buy", filled_qty: 1, filled_avg_price: 100 }),
      fill({ book: "a", symbol: "SOL/USD", side: "sell", filled_qty: 1, filled_avg_price: 95 }),
    ]);
    const s = tradeStats(books.get("a")!.closedTrades);
    expect(s.trades).toBe(2);
    expect(s.winRate).toBe(0.5);
    expect(s.expectancy).toBeCloseTo(2.5);
    expect(s.profitFactor).toBeCloseTo(2);
    expect(s.maxDrawdown).toBeCloseTo(5);
  });
});
