import {
  desks,
  disconnectedSnapshot,
  emptyMetrics,
  snapshotSchema,
  type FloorEvent,
  type Snapshot,
} from "../model";
import { deskForMethod, deskIds, methodMentioned, type DeskId } from "./desks";
import {
  baseAsset,
  fifoPnl,
  type JournalSignal,
  type JournalTrade,
} from "./journal";

export type PaperAccount = {
  equity: number | null;
  lastEquity: number | null;
  portfolioValue: number | null;
  cash: number | null;
  status: string | null;
  cryptoStatus: string | null;
};

export type PaperPosition = {
  symbol: string;
  qty: number;
  marketValue: number;
  unrealizedPl: number;
  currentPrice: number;
  assetClass: string;
  side: string;
};

export type PaperBrokerOrder = {
  id: string;
  symbol: string;
  side: "buy" | "sell" | string;
  status: string;
  submittedAt: string | null;
  filledAt: string | null;
  filledAvgPrice: number | null;
  filledQty: number | null;
  notional: number | null;
  clientOrderId: string | null;
};

export type PaperQuote = {
  symbol: string;
  price: number;
  changePct: number;
  timestamp: string;
};

export type PaperBook = {
  now: string;
  account: PaperAccount | null;
  positions: PaperPosition[];
  orders: PaperBrokerOrder[];
  quotes: PaperQuote[];
  trades: JournalTrade[];
  signals: JournalSignal[];
  ignoredLiveRows: number;
  openByDesk: Record<DeskId, number> | null;
  latencyMs: number | null;
  heartbeat: string | null;
  heartbeatSource: string | null;
  halt: { halted: boolean; reason: string | null };
  sources: { alpaca: boolean; dashboard: boolean; journal: boolean };
  alpacaError: string | null;
  dashboardError: string | null;
  journalError: string | null;
};

const OPEN_STATUSES = new Set([
  "new",
  "accepted",
  "pending_new",
  "accepted_for_bidding",
  "partially_filled",
  "held",
  "pending_replace",
  "pending_cancel",
]);

function eventId(parts: string[]) {
  const raw = parts.join("|");
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `paper-${(hash >>> 0).toString(16)}`;
}

function marksOf(quotes: PaperQuote[]) {
  return new Map(quotes.map((q) => [baseAsset(q.symbol), q.price]));
}

function journalCovers(order: PaperBrokerOrder, trades: JournalTrade[]) {
  if (!order.filledAt || order.status.toLowerCase() !== "filled") return false;
  const at = Date.parse(order.filledAt);
  if (Number.isNaN(at)) return false;
  return trades.some((trade) => {
    if (trade.sim) return false;
    if (baseAsset(trade.symbol) !== baseAsset(order.symbol)) return false;
    if (trade.action !== order.side.toLowerCase()) return false;
    return Math.abs(Date.parse(trade.timestamp) - at) < 120_000;
  });
}

function tradeEvent(trade: JournalTrade): FloorEvent {
  const desk = deskForMethod(trade.method);
  const sim = trade.sim;
  return {
    id: eventId([
      "fill",
      trade.timestamp,
      trade.method,
      trade.symbol,
      trade.action,
      String(trade.qty),
      String(trade.sim),
    ]),
    timestamp: trade.timestamp,
    teamId: desk,
    agentId: null,
    eventType: "ORDER_FILLED",
    symbol: baseAsset(trade.symbol),
    tradeId: `${trade.method}:${baseAsset(trade.symbol)}:${trade.timestamp}`,
    orderId: null,
    severity: "info",
    title: sim
      ? `ORDER FILLED · SIM CURRICULUM ${trade.action.toUpperCase()}`
      : `ORDER FILLED · ALPACA PAPER ${trade.action.toUpperCase()}`,
    description: sim
      ? `${trade.method} ${trade.action} ${baseAsset(trade.symbol)} is a curriculum fill (sim=true), not a broker cash fill. ${trade.reason}`.trim()
      : `${trade.method} ${trade.action} ${baseAsset(trade.symbol)} is recorded as an Alpaca paper fill (sim=false). ${trade.reason}`.trim(),
    mode: "PAPER",
    correlationId: `awadbot:${trade.method}:${baseAsset(trade.symbol)}:${trade.timestamp}`,
    source: sim
      ? "AwadBot journal sim=true (curriculum fill, not a broker cash fill)"
      : "AwadBot journal sim=false (Alpaca paper fill)",
    payload: {
      sim,
      brokerSettled: !sim,
      method: trade.method,
      action: trade.action,
      qty: trade.qty,
      price: trade.price,
      notional: trade.notional,
      reason: trade.reason,
    },
  };
}

function signalEvent(signal: JournalSignal): FloorEvent {
  return {
    id: eventId(["signal", signal.timestamp, signal.method, signal.symbol, signal.detail]),
    timestamp: signal.timestamp,
    teamId: deskForMethod(signal.method),
    agentId: null,
    eventType: "SIGNAL_DETECTED",
    symbol: baseAsset(signal.symbol),
    tradeId: null,
    orderId: null,
    severity: "info",
    title: `SIGNAL · ${signal.method}`,
    description: signal.detail,
    mode: "PAPER",
    correlationId: `awadbot:${signal.method}:${baseAsset(signal.symbol)}:${signal.timestamp}`,
    source: "AwadBot experience journal",
    payload: { method: signal.method, sim: false, brokerSettled: false },
  };
}

function orderEvent(order: PaperBrokerOrder): FloorEvent | null {
  const status = order.status.toLowerCase();
  const method = methodMentioned(order.clientOrderId);
  const desk = deskForMethod(method);
  const symbol = baseAsset(order.symbol);
  const when = order.filledAt ?? order.submittedAt;
  if (!when || !symbol) return null;
  let eventType: FloorEvent["eventType"] | null = null;
  if (status === "filled") eventType = "ORDER_FILLED";
  else if (status === "partially_filled" && (order.filledQty ?? 0) > 0)
    eventType = "ORDER_PARTIALLY_FILLED";
  else if (status === "canceled" || status === "cancelled" || status === "expired")
    eventType = "ORDER_CANCELLED";
  else if (status === "rejected" || status === "suspended") eventType = "ORDER_FAILED";
  else if (OPEN_STATUSES.has(status)) eventType = "ORDER_ACCEPTED";
  if (!eventType) return null;
  const brokerFill = eventType === "ORDER_FILLED" || eventType === "ORDER_PARTIALLY_FILLED";
  return {
    id: eventId(["broker", order.id, status]),
    timestamp: when,
    teamId: desk,
    agentId: null,
    eventType,
    symbol,
    tradeId: null,
    orderId: order.id,
    severity: eventType === "ORDER_FAILED" ? "warning" : "info",
    title: brokerFill
      ? `ALPACA PAPER ${order.side.toUpperCase()} ${status.toUpperCase()}`
      : `ALPACA PAPER ${order.side.toUpperCase()} ${status.replaceAll("_", " ").toUpperCase()}`,
    description: brokerFill
      ? `Broker paper order ${order.id} is ${status}. This is an Alpaca paper acknowledgment, not a simulated curriculum row.`
      : `Broker paper order ${order.id} is ${status}. No fill is recorded until Alpaca reports one.`,
    mode: "PAPER",
    correlationId: `alpaca:${order.id}`,
    source: "Alpaca paper broker",
    payload: {
      sim: false,
      brokerSettled: status === "filled",
      status,
      side: order.side,
      method,
      filledQty: order.filledQty,
      filledAvgPrice: order.filledAvgPrice,
    },
  };
}

export function brokerCryptoMarketValue(positions: PaperPosition[]) {
  return positions
    .filter((p) => {
      const klass = p.assetClass.toLowerCase();
      return klass === "crypto" || p.symbol.includes("/");
    })
    .reduce((sum, p) => sum + (Number.isFinite(p.marketValue) ? p.marketValue : 0), 0);
}

export function buildPaperSnapshot(book: PaperBook): Snapshot {
  const base = disconnectedSnapshot();
  const connected = Boolean(book.account) || book.sources.journal;
  const marks = marksOf(book.quotes);
  const events: FloorEvent[] = [
    ...book.signals.map(signalEvent),
    ...book.trades.map(tradeEvent),
    ...book.orders
      .filter((order) => !journalCovers(order, book.trades))
      .map(orderEvent)
      .filter((event): event is FloorEvent => event !== null),
  ];
  if (book.ignoredLiveRows > 0) {
    events.push({
      id: eventId(["ignored-live", book.now, String(book.ignoredLiveRows)]),
      timestamp: book.now,
      teamId: null,
      agentId: null,
      eventType: "GUARDRAIL_REJECTED",
      symbol: null,
      tradeId: null,
      orderId: null,
      severity: "critical",
      title: "LIVE JOURNAL ROWS IGNORED",
      description: `${book.ignoredLiveRows} journal row(s) were marked live and were not imported.`,
      mode: "PAPER",
      correlationId: `guard:live-rows:${book.now}`,
      source: "COMMAND paper guard",
      payload: { ignoredLiveRows: book.ignoredLiveRows },
    });
  }
  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
  const recent = events.slice(-400);

  const teamPnl = new Map<DeskId, { pnl: number | null; openTrades: number; tradeCount: number }>();
  for (const desk of deskIds) {
    const trades = book.trades.filter((trade) => deskForMethod(trade.method) === desk);
    const fifo = fifoPnl(trades, marks);
    const pnl = trades.length
      ? Math.round((fifo.realized + fifo.unrealized) * 100) / 100
      : null;
    teamPnl.set(desk, {
      pnl,
      openTrades: book.openByDesk ? book.openByDesk[desk] : fifo.openSymbols,
      tradeCount: trades.length,
    });
  }

  const equity = book.account?.equity ?? book.account?.portfolioValue ?? null;
  const lastEquity = book.account?.lastEquity ?? null;
  const paperPnl =
    equity !== null && lastEquity !== null
      ? Math.round((equity - lastEquity) * 100) / 100
      : null;
  const openOrders = book.orders.filter((order) =>
    OPEN_STATUSES.has(order.status.toLowerCase()),
  ).length;
  const simFills = book.trades.filter((trade) => trade.sim).length;
  const brokerJournalFills = book.trades.filter((trade) => !trade.sim).length;

  const snapshot: Snapshot = {
    ...base,
    timestamp: book.now,
    source: connected
      ? "AwadBot shared Alpaca paper book"
      : "Not connected",
    engine: book.halt.halted ? "HALTED" : connected ? "ONLINE" : "OFFLINE",
    health: [
      {
        name: "Agent engine",
        status: book.sources.dashboard ? "ONLINE" : "UNKNOWN",
        detail: book.sources.dashboard
          ? "AwadBot /api/status returned PAPER."
          : book.dashboardError ?? "AwadBot status URL is not configured.",
      },
      {
        name: "Alpaca",
        status: book.sources.alpaca ? "ONLINE" : book.alpacaError ? "OFFLINE" : "UNKNOWN",
        detail: book.sources.alpaca
          ? `Paper account ${book.account?.status ?? "loaded"}. Crypto status ${book.account?.cryptoStatus ?? "unknown"}. Broker crypto market value ${brokerCryptoMarketValue(book.positions).toFixed(2)}.`
          : book.alpacaError ?? "Alpaca paper keys are not configured.",
      },
      {
        name: "Supabase event store",
        status: "UNKNOWN",
        detail: "Floor events are read from the shared paper book, not Supabase.",
      },
      {
        name: "Market data",
        status: book.quotes.length ? "ONLINE" : "OFFLINE",
        detail: book.quotes.length
          ? "Alpaca crypto snapshots."
          : "No Alpaca crypto quotes loaded.",
      },
      {
        name: "News feed",
        status: "UNKNOWN",
        detail: "No news provider on this paper path. Phantom mirrors scalp_momentum.",
      },
      {
        name: "AI provider",
        status: "UNKNOWN",
        detail: "Desk orders are not generated by COMMAND.",
      },
      {
        name: "Execution worker",
        status: book.sources.journal || book.heartbeat ? "ONLINE" : "UNKNOWN",
        detail: book.journalError
          ? book.journalError
          : `AwadBot python run.py owns execution. COMMAND is observe-only. Journal fills: ${brokerJournalFills} broker-marked, ${simFills} sim curriculum.`,
      },
    ],
    teams: desks.map((desk) => {
      const row = teamPnl.get(desk.id as DeskId)!;
      return {
        id: desk.id,
        status: "PAPER LEAGUE" as const,
        mode: "PAPER" as const,
        metrics: { ...emptyMetrics, tradeCount: row.tradeCount },
        pnl: row.pnl,
        openTrades: row.openTrades,
        risk: "UNKNOWN" as const,
      };
    }),
    events: recent,
    markets: book.quotes
      .filter((q) => q.price > 0 && baseAsset(q.symbol))
      .map((q) => ({
        symbol: baseAsset(q.symbol),
        price: q.price,
        change: Math.round(q.changePct * 100) / 100,
        timestamp: q.timestamp,
      })),
    portfolio: {
      paperBalance: equity,
      liveBalance: null,
      paperPnl,
      livePnl: null,
      openPositions: book.account ? book.positions.length : null,
    },
    killSwitch: book.halt.halted
      ? {
          halted: true,
          reason: book.halt.reason,
          timestamp: book.heartbeat,
          triggeredBy: "AwadBot risk_state",
        }
      : {
          halted: false,
          reason: null,
          timestamp: null,
          triggeredBy: null,
        },
    regime: null,
    queueDepth: book.account || book.sources.journal ? openOrders : null,
    openOrders: book.account || book.sources.journal ? openOrders : null,
    latencyMs: book.latencyMs,
    uptimePct: null,
    lastCycle: book.heartbeat,
  };
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success) {
    return {
      ...base,
      timestamp: book.now,
      source: "Not connected",
      engine: "OFFLINE",
      health: base.health.map((row) =>
        row.name === "Alpaca"
          ? { ...row, status: "OFFLINE", detail: "Paper snapshot failed validation." }
          : row,
      ),
    };
  }
  return parsed.data;
}
