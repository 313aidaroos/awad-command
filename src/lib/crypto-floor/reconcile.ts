/**
 * Broker reconcile, FLOOR POSITIONS ONLY (2026-10-02). PURE.
 *
 * Every tick the floor compares what its own books claim (desk ledgers + the owner's manual book, built only from
 * orders the floor placed: client_order_id "cf-…", plus earlier "rc-…" reconcile rows) with what the broker account
 * actually holds. Rules:
 * - Reconcile only ever REDUCES the floor's own claims. It never adopts a broker position the floor didn't open
 *   (AwadBot's AMD, an AAPL option, anything else): those are never read into a book, scored, or sold.
 * - Claimed > broker (beyond fee dust): the shortfall is cleared from the claiming books (pro rata) with a synthetic
 *   "rc-" ledger row at the current price. NO sell is sent to the broker. Stops then evaluate the real quantity.
 * - Symbols with an unresolved floor order, or a fill in the last few minutes, are skipped this tick (in flight).
 */
import { contractMultiplier } from "./assets";
import { stamp } from "./engine";
import type { Book } from "./ledger";
import type { OrderRow } from "./types";

export const RECONCILE_FILL_GRACE_MS = 3 * 60_000;
/** Shortfall tolerated as fee dust: Alpaca takes crypto fees in the coin (~0.25%). */
export const RECONCILE_TOLERANCE_PCT = 1;

/** Orders that belong in a floor PAPER book. Everything else in Alpaca is not ours. */
export function floorOwnedOrder(o: Pick<OrderRow, "mode" | "client_order_id">): boolean {
  if (o.mode !== "paper") return true; // shadow (sx-) and live (Coinbase) books are separate and never broker-reconciled here
  return /^(cf|rc)-/.test(o.client_order_id);
}

export type ReconcileAdjustment = {
  book: string;
  symbol: string;
  claimedQty: number;
  bookQty: number;
  brokerQty: number;
  reduceBy: number;
  price: number;
  strategy: string | null;
  reason: string;
};

export type ReconcileInput = {
  now: number;
  books: Map<string, Book>;
  /** Long quantity the broker holds, by floor symbol. */
  brokerQty: Map<string, number>;
  prices: Map<string, number>;
  /** Orders created recently (any status) — in-flight symbols are skipped. */
  recentOrders: OrderRow[];
  openStatuses: Set<string>;
};

const isFloorPaperBook = (id: string) => !id.startsWith("exp:") && !id.startsWith("live:") && id !== "backtest";

export function planReconcile(input: ReconcileInput): ReconcileAdjustment[] {
  const claims = new Map<string, Array<{ book: string; qty: number; avg: number; strategy: string | null }>>();
  for (const [id, book] of input.books) {
    if (!isFloorPaperBook(id)) continue;
    for (const p of book.positions.values()) {
      if (!(p.qty > 0)) continue;
      const list = claims.get(p.symbol) ?? [];
      list.push({ book: id, qty: p.qty, avg: p.avgEntryPrice, strategy: p.strategy });
      claims.set(p.symbol, list);
    }
  }
  const inFlight = new Set(
    input.recentOrders
      .filter((o) => o.mode === "paper" && (input.openStatuses.has(o.status) || (o.filled_at && input.now - Date.parse(o.filled_at) < RECONCILE_FILL_GRACE_MS)))
      .map((o) => o.symbol),
  );
  const out: ReconcileAdjustment[] = [];
  for (const [symbol, list] of claims) {
    if (inFlight.has(symbol)) continue;
    const claimed = list.reduce((s, c) => s + c.qty, 0);
    const broker = Math.max(0, input.brokerQty.get(symbol) ?? 0);
    const shortfall = claimed - broker;
    if (shortfall <= 0) continue;
    const price = input.prices.get(symbol) ?? list[0].avg;
    const fullClear = broker <= 0;
    if (!fullClear && (shortfall / claimed) * 100 <= RECONCILE_TOLERANCE_PCT) continue; // fee dust
    if (!fullClear && shortfall * price < 1) continue;
    for (const c of list) {
      const reduceBy = fullClear ? c.qty : (c.qty / claimed) * shortfall;
      out.push({
        book: c.book,
        symbol,
        claimedQty: claimed,
        bookQty: c.qty,
        brokerQty: broker,
        reduceBy,
        price,
        strategy: c.strategy,
        reason: fullClear
          ? `Reconcile: broker holds 0 ${symbol} but the floor's books claim ${claimed} — ghost position cleared, no sell sent`
          : `Reconcile: broker holds ${broker} ${symbol} vs ${claimed} claimed — ${c.book} reduced by ${reduceBy}, no sell sent`,
      });
    }
  }
  return out;
}

/** The ledger row that records an adjustment (never sent to a broker; "rc-" prefix). Price stored as quoted (per share). */
export function reconcileRow(a: ReconcileAdjustment, now: number): OrderRow {
  const iso = new Date(now).toISOString();
  return {
    client_order_id: `rc-${a.book}-${a.symbol.replace("/", "")}-${stamp(now)}`,
    created_at: iso,
    updated_at: iso,
    book: a.book,
    desk: a.book === "manual" ? null : a.book,
    strategy: a.strategy,
    mode: "paper",
    venue: "sim",
    symbol: a.symbol,
    side: "sell",
    intent: "exit",
    qty: a.reduceBy,
    status: "filled",
    alpaca_order_id: null,
    filled_qty: a.reduceBy,
    filled_avg_price: a.price / contractMultiplier(a.symbol),
    filled_at: iso,
    reason: a.reason,
  };
}
