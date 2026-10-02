import type { OrderRow, Position } from "./types";

/**
 * Per-book ledger built from filled orders. Pure.
 *
 * Alpaca nets every buy and sell of a coin into ONE position per account, and the shared paper account
 * also holds AwadBot's coins. So each desk's positions come from its own fills, never from Alpaca's
 * position list. Average-cost accounting; a position whose remainder is worth less than `dustUsd` is
 * closed (Alpaca charges crypto fees in the coin, so a full sell can leave a few satoshis behind).
 */

export type BookPosition = {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  costBasis: number;
  openedAt: string;
  lastEntryAt: string;
  tranches: number;
};

export type ClosedTrade = {
  book: string;
  symbol: string;
  entryAt: string;
  exitAt: string;
  qty: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  exitReason: string | null;
};

export type Book = {
  id: string;
  positions: Map<string, BookPosition>;
  realizedPnl: number;
  closedTrades: ClosedTrade[];
  fills: number;
};

type RoundTrip = { boughtQty: number; soldQty: number; soldValue: number; entryValue: number; realized: number };

function fillTime(o: OrderRow) {
  return o.filled_at ?? o.updated_at ?? o.created_at;
}

export function buildBooks(orders: OrderRow[], dustUsd = 1): Map<string, Book> {
  const books = new Map<string, Book>();
  const trips = new Map<string, RoundTrip>();
  const fills = orders
    .filter((o) => o.filled_qty > 0 && (o.filled_avg_price ?? 0) > 0)
    .sort((a, b) => fillTime(a).localeCompare(fillTime(b)) || a.client_order_id.localeCompare(b.client_order_id));

  for (const o of fills) {
    let book = books.get(o.book);
    if (!book) {
      book = { id: o.book, positions: new Map(), realizedPnl: 0, closedTrades: [], fills: 0 };
      books.set(o.book, book);
    }
    book.fills++;
    const price = Number(o.filled_avg_price);
    const qty = Number(o.filled_qty);
    const at = fillTime(o);
    const key = `${o.book}|${o.symbol}`;
    const pos = book.positions.get(o.symbol);

    if (o.side === "buy") {
      if (!pos) {
        book.positions.set(o.symbol, {
          symbol: o.symbol,
          qty,
          avgEntryPrice: price,
          costBasis: qty * price,
          openedAt: at,
          lastEntryAt: at,
          tranches: 1,
        });
        trips.set(key, { boughtQty: qty, soldQty: 0, soldValue: 0, entryValue: 0, realized: 0 });
      } else {
        pos.qty += qty;
        pos.costBasis += qty * price;
        pos.avgEntryPrice = pos.costBasis / pos.qty;
        pos.lastEntryAt = at;
        pos.tranches += 1;
        const trip = trips.get(key);
        if (trip) trip.boughtQty += qty;
      }
      continue;
    }

    // Sell: only what this book holds. A sell with no book position (e.g. a manual sell of an old coin)
    // has no cost basis here and is ignored for P&L.
    if (!pos) continue;
    const costBefore = pos.costBasis;
    const sold = Math.min(qty, pos.qty);
    const entryValue = sold * pos.avgEntryPrice;
    const realized = sold * price - entryValue;
    book.realizedPnl += realized;
    pos.qty -= sold;
    pos.costBasis -= entryValue;
    const trip = trips.get(key) ?? { boughtQty: sold, soldQty: 0, soldValue: 0, entryValue: 0, realized: 0 };
    trip.soldQty += sold;
    trip.soldValue += sold * price;
    trip.entryValue += entryValue;
    trip.realized += realized;
    trips.set(key, trip);

    // Closed when what is left is dust: under $dustUsd, or under 1% of the position's cost before this sale
    // (Alpaca takes the crypto fee in the coin, so a "sell all" of the gross fill leaves ~0.25% behind).
    if (pos.qty * price < Math.max(dustUsd, costBefore * 0.01)) {
      // Leftover dust is written off at cost (it is the fee Alpaca took in coin).
      if (pos.qty > 0) {
        const writeOff = pos.costBasis;
        book.realizedPnl -= writeOff;
        trip.realized -= writeOff;
      }
      book.closedTrades.push({
        book: o.book,
        symbol: o.symbol,
        entryAt: pos.openedAt,
        exitAt: at,
        qty: trip.soldQty,
        entryPrice: trip.soldQty > 0 ? trip.entryValue / trip.soldQty : pos.avgEntryPrice,
        exitPrice: trip.soldQty > 0 ? trip.soldValue / trip.soldQty : price,
        pnl: trip.realized,
        pnlPct: trip.entryValue > 0 ? (trip.realized / trip.entryValue) * 100 : 0,
        exitReason: o.reason,
      });
      book.positions.delete(o.symbol);
      trips.delete(key);
    } else {
      pos.avgEntryPrice = pos.costBasis / pos.qty;
    }
  }
  return books;
}

export function emptyBook(id: string): Book {
  return { id, positions: new Map(), realizedPnl: 0, closedTrades: [], fills: 0 };
}

export type MarkedBook = {
  id: string;
  capital: number;
  realizedPnl: number;
  unrealizedPnl: number;
  equity: number;
  positions: Position[];
  closedTrades: ClosedTrade[];
};

/** Mark a book to market. Positions with no price keep their cost (unrealized 0). */
export function markBook(book: Book, capital: number, prices: Map<string, number>): MarkedBook {
  let unrealized = 0;
  const positions: Position[] = [];
  for (const p of book.positions.values()) {
    const price = prices.get(p.symbol) ?? p.avgEntryPrice;
    const pnl = (price - p.avgEntryPrice) * p.qty;
    unrealized += pnl;
    positions.push({
      symbol: p.symbol,
      qty: p.qty,
      avgEntryPrice: p.avgEntryPrice,
      currentPrice: price,
      unrealizedPnl: pnl,
      unrealizedPnlPct: p.avgEntryPrice > 0 ? ((price - p.avgEntryPrice) / p.avgEntryPrice) * 100 : 0,
      enteredAt: p.openedAt,
      tranches: p.tranches,
    });
  }
  return {
    id: book.id,
    capital,
    realizedPnl: book.realizedPnl,
    unrealizedPnl: unrealized,
    equity: capital + book.realizedPnl + unrealized,
    positions,
    closedTrades: book.closedTrades,
  };
}

export type TradeStats = {
  trades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  expectancy: number | null;
  expectancyPct: number | null;
  profitFactor: number | null;
  realized: number;
  maxDrawdown: number;
  best: ClosedTrade | null;
  worst: ClosedTrade | null;
};

/** Stats over closed round trips (optionally only those that exited at or after `since`). */
export function tradeStats(trades: ClosedTrade[], since?: number): TradeStats {
  const list = trades
    .filter((t) => since === undefined || Date.parse(t.exitAt) >= since)
    .sort((a, b) => a.exitAt.localeCompare(b.exitAt));
  const wins = list.filter((t) => t.pnl > 0);
  const losses = list.filter((t) => t.pnl <= 0);
  const sum = (xs: ClosedTrade[]) => xs.reduce((s, t) => s + t.pnl, 0);
  let peak = 0;
  let cum = 0;
  let maxDd = 0;
  for (const t of list) {
    cum += t.pnl;
    peak = Math.max(peak, cum);
    maxDd = Math.max(maxDd, peak - cum);
  }
  const grossWin = sum(wins);
  const grossLoss = -sum(losses);
  return {
    trades: list.length,
    wins: wins.length,
    losses: losses.length,
    winRate: list.length ? wins.length / list.length : null,
    avgWin: wins.length ? grossWin / wins.length : null,
    avgLoss: losses.length ? -grossLoss / losses.length : null,
    expectancy: list.length ? sum(list) / list.length : null,
    expectancyPct: list.length ? list.reduce((s, t) => s + t.pnlPct, 0) / list.length : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    realized: sum(list),
    maxDrawdown: maxDd,
    best: list.length ? list.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null,
    worst: list.length ? list.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null,
  };
}
