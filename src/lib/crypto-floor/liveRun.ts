/**
 * REAL MONEY step of the tick (Coinbase I/O). Runs after the paper step; never throws into the tick.
 * 1) Read Coinbase: key permissions, balances, best bid/ask (and product rules when a desk is live).
 * 2) Reconcile unresolved real-money orders (by Coinbase order id, or by client_order_id after a timeout).
 * 3) planLive() (pure) → place orders. With no desk switched on this only reports status.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { CoinbaseClient, CoinbaseHttpError, mapCoinbaseStatus, toProductId, type CoinbaseOrder } from "./coinbase";
import type { EventLog } from "./events";
import { effectiveFillPrice, planLive, type CoinbaseState, type LivePlan, type LivePlannedOrder } from "./live";
import { writeBaselines } from "./store";
import type { Bar, DeskRow, FloorParamsRow, OrderRow } from "./types";

export type LiveSummary = {
  configured: boolean;
  ok: boolean;
  error: string | null;
  canTrade: boolean;
  canTransfer: boolean;
  usdAvailable: number;
  totalUsd: number;
  holdings: Array<{ currency: string; available: number; hold: number; usdValue: number | null }>;
  enabledDesks: string[];
  blocked: string | null;
  exposureUsd: number;
  dayPnl: number;
  pnlNow: number;
  pausedUntil: string | null;
  orders: { planned: number; submitted: number; filled: number; rejected: number };
  limits: { maxTotalUsd: number; maxTradeUsd: number; dayLossUsd: number };
};

const emptyState = (configured: boolean, error: string | null): CoinbaseState => ({
  configured,
  ok: false,
  error,
  canView: false,
  canTrade: false,
  canTransfer: false,
  usdAvailable: 0,
  coins: new Map(),
  prices: new Map(),
  products: new Map(),
});

export async function readCoinbaseState(client: CoinbaseClient | null, universe: string[], withProducts: boolean): Promise<{ state: CoinbaseState; holdings: LiveSummary["holdings"]; totalUsd: number }> {
  if (!client) return { state: emptyState(false, null), holdings: [], totalUsd: 0 };
  try {
    const productIds = universe.map(toProductId);
    const [perms, accounts, book] = await Promise.all([client.keyPermissions(), client.accounts(), client.bestBidAsk(productIds)]);
    const state = emptyState(true, null);
    state.ok = true;
    state.canView = perms.can_view === true;
    state.canTrade = perms.can_trade === true;
    state.canTransfer = perms.can_transfer === true;
    for (const pair of universe) {
      const q = book.get(toProductId(pair));
      if (q) state.prices.set(pair, q.mid);
    }
    const holdings: LiveSummary["holdings"] = [];
    let totalUsd = 0;
    for (const a of accounts) {
      const available = Number(a.available_balance?.value ?? 0);
      const hold = Number(a.hold?.value ?? 0);
      if (!(available > 0 || hold > 0)) continue;
      const cur = a.currency.toUpperCase();
      if (cur === "USD" || cur === "USDC") {
        if (cur === "USD") state.usdAvailable += available;
        holdings.push({ currency: cur, available, hold, usdValue: available + hold });
        totalUsd += available + hold;
        continue;
      }
      const pair = `${cur}/USD`;
      if (universe.includes(pair)) state.coins.set(pair, (state.coins.get(pair) ?? 0) + available);
      const px = state.prices.get(pair) ?? null;
      const usdValue = px ? (available + hold) * px : null;
      if (usdValue !== null) totalUsd += usdValue;
      holdings.push({ currency: cur, available, hold, usdValue });
    }
    if (withProducts) {
      for (const pair of universe) {
        try {
          const p = await client.product(toProductId(pair));
          state.products.set(pair, {
            baseIncrement: p.base_increment,
            quoteIncrement: p.quote_increment,
            quoteMin: p.quote_min_size ? Number(p.quote_min_size) : undefined,
            baseMin: p.base_min_size ? Number(p.base_min_size) : undefined,
            disabled: p.trading_disabled === true || (p.status !== undefined && p.status !== "online"),
          });
        } catch {
          state.products.set(pair, { disabled: true });
        }
      }
    }
    return { state, holdings: holdings.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0)), totalUsd };
  } catch (err) {
    const msg = err instanceof CoinbaseHttpError ? `HTTP ${err.status} ${err.body.slice(0, 160)}` : err instanceof Error ? err.message.slice(0, 200) : String(err);
    return { state: emptyState(true, msg), holdings: [], totalUsd: 0 };
  }
}

async function applyCoinbaseOrder(db: SupabaseClient, log: EventLog, row: OrderRow, o: CoinbaseOrder) {
  const filled = Number(o.filled_size ?? 0);
  const status = mapCoinbaseStatus(o.status, filled);
  const fees = Number(o.total_fees ?? 0);
  const eff = effectiveFillPrice(row.side, filled, Number(o.average_filled_price ?? 0), o.filled_value ? Number(o.filled_value) : null, fees);
  if (status === row.status && filled === row.filled_qty && o.order_id === row.venue_order_id) return status;
  await db
    .from("crypto_floor_orders")
    .update({
      status,
      venue_order_id: o.order_id,
      filled_qty: filled,
      filled_avg_price: eff,
      fees,
      filled_at: o.last_fill_time ?? (status === "filled" ? new Date().toISOString() : null),
      updated_at: new Date().toISOString(),
    })
    .eq("client_order_id", row.client_order_id);
  const who = (row.desk ?? row.book).toUpperCase();
  if (status === "filled" && row.status !== "filled") {
    await log.log({
      type: "order_filled",
      agentRole: "trader",
      desk: row.desk,
      strategy: row.strategy,
      symbol: row.symbol,
      side: row.side,
      qty: filled,
      price: eff,
      orderId: row.client_order_id,
      title: `REAL MONEY · ${who} ${row.side.toUpperCase()} ${filled} ${row.symbol} filled on Coinbase @ ${Number(o.average_filled_price ?? 0).toFixed(2)} (fees $${fees.toFixed(2)})`,
      payload: { live: true, venue: "coinbase", coinbase_order_id: o.order_id, status: o.status, fees },
    });
  } else if ((status === "canceled" || status === "rejected") && row.status !== status) {
    await log.log({ type: status === "canceled" ? "order_canceled" : "order_rejected", agentRole: "trader", desk: row.desk, strategy: row.strategy, symbol: row.symbol, side: row.side, orderId: row.client_order_id, title: `REAL MONEY · ${who} ${row.side.toUpperCase()} ${row.symbol} ${status} on Coinbase (${o.status})`, payload: { live: true, venue: "coinbase", coinbase_order_id: o.order_id } });
  }
  return status;
}

export async function reconcileLive(db: SupabaseClient, client: CoinbaseClient, log: EventLog, now: number): Promise<number> {
  const { data } = await db
    .from("crypto_floor_orders")
    .select("*")
    .eq("mode", "live")
    .in("status", ["pending_submit", "submitted", "partially_filled", "unknown"])
    .gte("created_at", new Date(now - 7 * 86_400_000).toISOString())
    .limit(50);
  let n = 0;
  for (const r of data ?? []) {
    const row = r as OrderRow;
    try {
      let order: CoinbaseOrder | null = null;
      if (row.venue_order_id) order = await client.getOrder(row.venue_order_id);
      else {
        const since = new Date(Date.parse(row.created_at) - 2 * 60_000).toISOString();
        order = (await client.listOrders({ productIds: [toProductId(row.symbol)], startDate: since })).find((o) => o.client_order_id === row.client_order_id) ?? null;
      }
      n++;
      if (order) await applyCoinbaseOrder(db, log, row, order);
      else if (now - Date.parse(row.created_at) > 5 * 60_000) {
        await db.from("crypto_floor_orders").update({ status: "rejected", error: "Coinbase has no order with this client_order_id — never reached the exchange", updated_at: new Date().toISOString() }).eq("client_order_id", row.client_order_id);
        await log.log({ type: "order_rejected", agentRole: "trader", desk: row.desk, strategy: row.strategy, symbol: row.symbol, side: row.side, orderId: row.client_order_id, title: `REAL MONEY · ${row.symbol} ${row.side} never reached Coinbase — marked rejected`, payload: { live: true } });
      }
    } catch {
      // Coinbase unreachable: leave unresolved; the planner will not stack another order on it.
    }
  }
  return n;
}

async function placeLiveOrder(db: SupabaseClient, client: CoinbaseClient, log: EventLog, o: LivePlannedOrder, sleep: (ms: number) => Promise<void>) {
  const claim = await db.from("crypto_floor_orders").insert({
    client_order_id: o.clientOrderId,
    book: o.book,
    desk: o.desk,
    strategy: o.strategy,
    mode: "live",
    venue: "coinbase",
    symbol: o.symbol,
    side: o.side,
    intent: o.intent,
    qty: o.estQty,
    status: "pending_submit",
    reason: o.reason,
    signal: { ...o.signal, seed: o.seed, quoteSize: o.quoteSize ?? null, baseSize: o.baseSize ?? null, refPrice: o.refPrice },
  });
  if (claim.error) {
    if (claim.error.code === "23505") return "duplicate" as const;
    throw new Error(`Real-money order claim failed: ${claim.error.message}`);
  }
  const row = { client_order_id: o.clientOrderId, created_at: new Date().toISOString(), book: o.book, desk: o.desk, strategy: o.strategy, mode: "live", symbol: o.symbol, side: o.side, intent: o.intent, qty: o.estQty, status: "pending_submit", alpaca_order_id: null, venue_order_id: null, filled_qty: 0, filled_avg_price: null, filled_at: null, reason: o.reason } as OrderRow;
  const what = o.side === "buy" ? `$${o.quoteSize} of ${o.symbol}` : `${o.baseSize} ${o.symbol}`;
  try {
    const r = await client.createMarketOrder({ productId: o.productId, side: o.side === "buy" ? "BUY" : "SELL", clientOrderId: o.clientOrderId, quoteSize: o.quoteSize, baseSize: o.baseSize });
    const orderId = r.success_response?.order_id ?? r.order_id;
    if (!r.success || !orderId) {
      const reason = r.error_response?.message || r.error_response?.new_order_failure_reason || r.error_response?.preview_failure_reason || r.error_response?.error || r.failure_reason || "rejected";
      await db.from("crypto_floor_orders").update({ status: "rejected", error: String(reason).slice(0, 1000), updated_at: new Date().toISOString() }).eq("client_order_id", o.clientOrderId);
      await log.log({ type: "order_rejected", agentRole: "trader", desk: o.desk, strategy: o.strategy, symbol: o.symbol, side: o.side, orderId: o.clientOrderId, title: `REAL MONEY · ${o.desk.toUpperCase()} ${o.side.toUpperCase()} ${what} rejected by Coinbase: ${String(reason).slice(0, 200)}`, payload: { live: true, venue: "coinbase", error: r.error_response ?? null } });
      return "rejected" as const;
    }
    await db.from("crypto_floor_orders").update({ status: "submitted", venue_order_id: orderId, updated_at: new Date().toISOString() }).eq("client_order_id", o.clientOrderId);
    row.status = "submitted";
    row.venue_order_id = orderId;
    await log.log({ type: "order_submitted", agentRole: "trader", desk: o.desk, strategy: o.strategy, symbol: o.symbol, side: o.side, qty: o.estQty, price: o.refPrice, orderId: o.clientOrderId, title: `REAL MONEY · ${o.desk.toUpperCase()} ${o.side.toUpperCase()} ${what} on Coinbase — ${o.reason}`, payload: { live: true, venue: "coinbase", coinbase_order_id: orderId, intent: o.intent } });
    await sleep(1500);
    try {
      const after = await client.getOrder(orderId);
      if (after) return (await applyCoinbaseOrder(db, log, row, after)) === "filled" ? ("filled" as const) : ("submitted" as const);
    } catch {
      // reconcile next tick
    }
    return "submitted" as const;
  } catch (err) {
    const definitive = err instanceof CoinbaseHttpError && err.status >= 400 && err.status < 500;
    const message = err instanceof Error ? err.message : String(err);
    await db.from("crypto_floor_orders").update({ status: definitive ? "rejected" : "unknown", error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("client_order_id", o.clientOrderId);
    await log.log({ type: definitive ? "order_rejected" : "system", agentRole: definitive ? "trader" : "system", desk: o.desk, strategy: o.strategy, symbol: o.symbol, side: o.side, orderId: o.clientOrderId, title: definitive ? `REAL MONEY · ${o.side.toUpperCase()} ${what} rejected: ${message.slice(0, 200)}` : `REAL MONEY · ${o.side.toUpperCase()} ${what}: state unknown (${message.slice(0, 120)}) — reconciling, no new order until resolved`, payload: { live: true, venue: "coinbase" } });
    return definitive ? ("rejected" as const) : ("unknown" as const);
  }
}

export async function runLiveStep(opts: {
  db: SupabaseClient;
  client: CoinbaseClient | null;
  log: EventLog;
  now: number;
  day: string;
  params: FloorParamsRow;
  desks: DeskRow[];
  /** Every coin the floor trades (Coinbase quotes/products). */
  universe: string[];
  /** Core desks' coins (custom-v1 desks use their spec's coins). Defaults to `universe`. */
  coreUniverse?: string[];
  bars: Map<string, Bar[]>;
  prices: Map<string, number>;
  dataStale: boolean;
  staleSymbols: Set<string>;
  filledOrders: OrderRow[];
  recentOrders: OrderRow[];
  baselines: Map<string, number>;
  sleep: (ms: number) => Promise<void>;
}): Promise<{ summary: LiveSummary; plan: LivePlan | null }> {
  const { db, client, log } = opts;
  const hasLive = opts.desks.some((d) => d.live_enabled) || opts.filledOrders.some((o) => o.mode === "live");
  if (client && hasLive) await reconcileLive(db, client, log, opts.now);
  const { state, holdings, totalUsd } = await readCoinbaseState(client, opts.universe, hasLive);
  const counts = { planned: 0, submitted: 0, filled: 0, rejected: 0 };
  let plan: LivePlan | null = null;
  if (hasLive) {
    plan = planLive({ now: opts.now, params: opts.params, desks: opts.desks, universe: opts.coreUniverse ?? opts.universe, bars: opts.bars, prices: opts.prices, dataStale: opts.dataStale, staleSymbols: opts.staleSymbols, filledOrders: opts.filledOrders, recentOrders: opts.recentOrders, baselines: opts.baselines, coinbase: state });
    await writeBaselines(db, opts.day, plan.baselinesToWrite);
    if (plan.pause) {
      await db.from("crypto_floor_params").update({ live_paused_until: plan.pause.until, live_pause_reason: plan.pause.reason }).eq("id", 1);
      await log.log({ type: "halt", agentRole: "risk", title: plan.pause.reason, payload: { scope: "live", until: plan.pause.until, dayPnl: plan.dayPnl } });
    } else if (plan.resume) {
      await db.from("crypto_floor_params").update({ live_paused_until: null, live_pause_reason: null }).eq("id", 1);
      await log.log({ type: "resume", agentRole: "risk", title: "New UTC day — real-money buys may resume", payload: { scope: "live" } });
    }
    counts.planned = plan.orders.length;
    if (client) {
      for (const o of plan.orders) {
        const r = await placeLiveOrder(db, client, log, o, opts.sleep);
        if (r === "submitted" || r === "filled") counts.submitted++;
        if (r === "filled") counts.filled++;
        if (r === "rejected") counts.rejected++;
      }
    }
  }
  return {
    plan,
    summary: {
      configured: state.configured,
      ok: state.ok,
      error: state.error,
      canTrade: state.canTrade,
      canTransfer: state.canTransfer,
      usdAvailable: state.usdAvailable,
      totalUsd,
      holdings: holdings.slice(0, 12),
      enabledDesks: plan?.enabledDesks ?? opts.desks.filter((d) => d.live_enabled).map((d) => d.id),
      blocked: plan?.blocked ?? null,
      exposureUsd: plan?.exposureUsd ?? 0,
      dayPnl: plan?.dayPnl ?? 0,
      pnlNow: plan?.pnlNow ?? 0,
      pausedUntil: plan?.pausedUntil ?? null,
      orders: counts,
      limits: { maxTotalUsd: opts.params.live_max_total_usd, maxTradeUsd: opts.params.live_max_trade_usd, dayLossUsd: opts.params.live_day_loss_usd },
    },
  };
}
