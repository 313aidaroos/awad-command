/**
 * Crypto Floor robot — the tick runner (I/O). Called by the Vercel cron every 5 minutes.
 *
 * Order of work (CHECK STATE → RECONCILE → THEN ACT):
 *  1. Paper-mode guard, single-leader lease.
 *  2. Reconcile every unresolved robot order with Alpaca (by client_order_id).
 *  3. Read account, broker positions, closed hourly bars (8 days) and latest trades for every coin a desk or test
 *     trades (core BTC/ETH/SOL + RONIN's own list).
 *  4. Build every desk's ledger, plan the tick (engine.ts, pure).
 *  5. Write pauses/resumes, signals, send paper orders, record shadow fills, heartbeat, snapshot.
 * Any error → `system` event + JSON error. The route always answers 200 so the cron never retries a half tick.
 *
 * 2026-10-02 riskier floor: the floor runs ONLY on its own Alpaca paper account (CRYPTO_FLOOR_ALPACA_*). Without it
 * (alpaca = null) the tick makes no broker call at all, logs "no own account" (once an hour) and writes a heartbeat
 * that the UI, health and the daily email show. Stocks (regular + extended hours) and options (regular hours, long
 * premium) join crypto (24/7). Every tick reconciles the floor's own books against its own broker holdings (no sells).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlpacaClient, AlpacaHttpError, NO_OWN_ACCOUNT_MESSAGE, formatQty, mapAlpacaStatus, roundQty, type AlpacaOrder } from "./alpaca";
import { OPTION_UNDERLYINGS, STOCK_UNIVERSE, assetClass, parseOcc, sessionWithClock, type Session } from "./assets";
import { agentForEvent, deskAssets } from "./desks";
import { OPTION_DTE_MAX, OPTION_DTE_MIN, planTick, type OptionCandidate, type PlannedOrder, type TickPlan } from "./engine";
import { buildBooks } from "./ledger";
import { floorOwnedOrder } from "./reconcile";
import { EventLog } from "./events";
import { HOUR_MS, closedBars, normalizePair, utcDay, watchStat, watchLine } from "./market";
import {
  acquireTickLease,
  loadBaselines,
  loadDesks,
  loadExperiments,
  loadFilledOrders,
  loadOpenPaperOrders,
  loadParams,
  loadRecentOrders,
  releaseTickLease,
  writeBaselines,
} from "./store";
import { DEFAULT_UNIVERSE, floorUniverse } from "./strategies";
import { CoinbaseClient, coinbaseConfig } from "./coinbase";
import { runLiveStep, type LiveSummary } from "./liveRun";
import type { Bar, OrderRow, WatchStat } from "./types";

export type TickResult = {
  ok: boolean;
  skipped?: string;
  error?: string;
  halted?: boolean;
  dataStale?: boolean;
  signals: number;
  ordersPlanned: number;
  ordersSubmitted: number;
  ordersFilled: number;
  ordersRejected: number;
  shadowFills: number;
  reconciled: number;
  eventsWritten: number;
  eventErrors: number;
  lastEventError?: string | null;
  floor?: TickPlan["floor"];
  watching?: string;
  dedicatedAccount?: boolean;
  /** true = CRYPTO_FLOOR_ALPACA_* keys missing: no broker calls, no trading. */
  noOwnAccount?: boolean;
  reconciled_positions?: number;
  session?: Session;
  coinbase?: Pick<LiveSummary, "configured" | "ok" | "error" | "canTrade" | "canTransfer" | "enabledDesks" | "blocked" | "orders">;
  durationMs: number;
};

type TickDeps = {
  db: SupabaseClient;
  /** The floor's OWN paper account; null = keys missing → "no own account" mode (no broker calls). */
  alpaca: AlpacaClient | null;
  /** REAL MONEY venue. undefined → built from env; null → not connected. */
  coinbase?: CoinbaseClient | null;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  tradeMode?: string;
};

const STALE_BAR_MS = 3 * HOUR_MS;
const STALE_TRADE_MS = 2 * HOUR_MS;
const STOCK_STALE_TRADE_MS = 30 * 60_000;
const MIN15_MS = 15 * 60_000;

function blank(): Omit<TickResult, "ok" | "durationMs"> {
  return { signals: 0, ordersPlanned: 0, ordersSubmitted: 0, ordersFilled: 0, ordersRejected: 0, shadowFills: 0, reconciled: 0, eventsWritten: 0, eventErrors: 0 };
}

async function applyRemote(db: SupabaseClient, log: EventLog, row: OrderRow, remote: AlpacaOrder): Promise<OrderRow["status"]> {
  const status = mapAlpacaStatus(remote.status);
  const filledQty = Number(remote.filled_qty || 0);
  const avg = remote.filled_avg_price ? Number(remote.filled_avg_price) : null;
  if (status === row.status && filledQty === row.filled_qty && remote.id === row.alpaca_order_id) return status;
  const { error } = await db
    .from("crypto_floor_orders")
    .update({
      status,
      alpaca_order_id: remote.id,
      filled_qty: filledQty,
      filled_avg_price: avg,
      filled_at: remote.filled_at ?? (status === "filled" ? new Date().toISOString() : null),
      updated_at: new Date().toISOString(),
    })
    .eq("client_order_id", row.client_order_id);
  if (error) throw new Error(`Order update failed for ${row.client_order_id}: ${error.message}`);
  const base = { desk: row.desk, strategy: row.strategy, symbol: row.symbol, side: row.side, orderId: row.client_order_id };
  if (status === "filled" && row.status !== "filled") {
    await log.log({
      ...base,
      type: "order_filled",
      agentRole: "trader",
      title: `${(row.desk ?? row.book).toUpperCase()} ${row.side.toUpperCase()} ${filledQty} ${row.symbol} filled @ ${avg ?? "market"}`,
      qty: filledQty,
      price: avg,
      payload: { alpaca_order_id: remote.id, intent: row.intent, reason: row.reason, agent: agentForEvent(row.desk, "trader") },
    });
  } else if ((status === "canceled" || status === "rejected") && row.status !== status) {
    await log.log({
      ...base,
      type: status === "canceled" ? "order_canceled" : "order_rejected",
      agentRole: "trader",
      title: `${(row.desk ?? row.book).toUpperCase()} ${row.side.toUpperCase()} ${row.symbol} ${status} by Alpaca (${remote.status}); filled ${filledQty}`,
      qty: filledQty || null,
      price: avg,
      payload: { alpaca_order_id: remote.id, alpaca_status: remote.status },
    });
  }
  return status;
}

async function reconcile(db: SupabaseClient, alpaca: AlpacaClient, log: EventLog, now: number): Promise<number> {
  const open = await loadOpenPaperOrders(db);
  let n = 0;
  for (const row of open) {
    let remote: AlpacaOrder | null;
    try {
      remote = await alpaca.orderByClientId(row.client_order_id);
    } catch {
      continue; // Alpaca unreachable: leave the order unresolved; planTick will not stack another on it.
    }
    n++;
    if (remote) {
      await applyRemote(db, log, row, remote);
      continue;
    }
    if ((row.status === "pending_submit" || row.status === "unknown") && now - Date.parse(row.created_at) > 2 * 60_000) {
      await db
        .from("crypto_floor_orders")
        .update({ status: "rejected", error: "Alpaca has no order with this client_order_id — never reached the broker", updated_at: new Date().toISOString() })
        .eq("client_order_id", row.client_order_id);
      await log.log({
        type: "order_rejected",
        agentRole: "trader",
        desk: row.desk,
        strategy: row.strategy,
        symbol: row.symbol,
        side: row.side,
        orderId: row.client_order_id,
        title: `${row.symbol} ${row.side} never reached Alpaca — marked rejected after reconcile`,
      });
    }
  }
  return n;
}

async function placePaperOrder(
  db: SupabaseClient,
  alpaca: AlpacaClient,
  log: EventLog,
  o: PlannedOrder,
  sleep: (ms: number) => Promise<void>,
): Promise<"submitted" | "filled" | "rejected" | "duplicate" | "unknown"> {
  const claim = await db.from("crypto_floor_orders").insert({
    client_order_id: o.clientOrderId,
    book: o.book,
    desk: o.desk,
    strategy: o.strategy,
    mode: "paper",
    symbol: o.symbol,
    side: o.side,
    intent: o.intent,
    qty: Number(formatQty(o.qty)),
    status: "pending_submit",
    reason: o.reason,
    signal: { ...o.signal, assetClass: o.assetClass, orderType: o.orderType, timeInForce: o.timeInForce, extendedHours: o.extendedHours, limitPrice: o.limitPrice ?? null, maxLossUsd: o.maxLossUsd ?? null },
  });
  if (claim.error) {
    if (claim.error.code === "23505") return "duplicate";
    throw new Error(`Order claim failed: ${claim.error.message}`);
  }
  const row: OrderRow = {
    client_order_id: o.clientOrderId,
    created_at: new Date().toISOString(),
    book: o.book,
    desk: o.desk,
    strategy: o.strategy,
    mode: "paper",
    symbol: o.symbol,
    side: o.side,
    intent: o.intent,
    qty: o.qty,
    status: "pending_submit",
    alpaca_order_id: null,
    filled_qty: 0,
    filled_avg_price: null,
    filled_at: null,
    reason: o.reason,
  };
  const base = { desk: o.desk, strategy: o.strategy, symbol: o.symbol, side: o.side, orderId: o.clientOrderId };
  let remote: AlpacaOrder;
  try {
    remote = await alpaca.submitOrder({
      symbol: o.symbol,
      qty: formatQty(o.qty),
      side: o.side,
      clientOrderId: o.clientOrderId,
      type: o.orderType,
      timeInForce: o.timeInForce,
      limitPrice: o.limitPrice,
      extendedHours: o.extendedHours,
    });
  } catch (err) {
    const definitive = err instanceof AlpacaHttpError && err.status >= 400 && err.status < 500;
    const message = err instanceof Error ? err.message : String(err);
    await db
      .from("crypto_floor_orders")
      .update({ status: definitive ? "rejected" : "unknown", error: message.slice(0, 1000), updated_at: new Date().toISOString() })
      .eq("client_order_id", o.clientOrderId);
    await log.log({
      ...base,
      type: definitive ? "order_rejected" : "system",
      agentRole: definitive ? "trader" : "system",
      title: definitive
        ? `${o.desk.toUpperCase()} ${o.side.toUpperCase()} ${o.symbol} rejected: ${message.slice(0, 240)}`
        : `${o.desk.toUpperCase()} ${o.side.toUpperCase()} ${o.symbol}: order state unknown (${message.slice(0, 160)}) — reconciling next tick, no new order until resolved`,
      qty: o.qty,
      payload: { error: message, intent: o.intent, reason: o.reason },
    });
    return definitive ? "rejected" : "unknown";
  }
  await db
    .from("crypto_floor_orders")
    .update({ status: mapAlpacaStatus(remote.status), alpaca_order_id: remote.id, updated_at: new Date().toISOString() })
    .eq("client_order_id", o.clientOrderId);
  row.status = mapAlpacaStatus(remote.status);
  row.alpaca_order_id = remote.id;
  await log.log({
    ...base,
    type: "order_submitted",
    agentRole: "trader",
    title: `${o.desk.toUpperCase()} ${o.side.toUpperCase()} ${formatQty(o.qty)} ${o.symbol} [${o.assetClass}${o.extendedHours ? ", extended hours" : ""}] (~$${(o.qty * o.refPrice).toFixed(2)}${o.maxLossUsd ? `, max loss $${o.maxLossUsd.toFixed(2)}` : ""}) — ${o.reason}`,
    qty: o.qty,
    price: o.refPrice,
    payload: { alpaca_order_id: remote.id, intent: o.intent, reason: o.reason, agent: agentForEvent(o.desk, "trader"), assetClass: o.assetClass, orderType: o.orderType, timeInForce: o.timeInForce, extendedHours: o.extendedHours, limitPrice: o.limitPrice ?? null, maxLossUsd: o.maxLossUsd ?? null },
  });
  await sleep(1500);
  try {
    const after = await alpaca.orderByClientId(o.clientOrderId);
    if (after) return (await applyRemote(db, log, row, after)) === "filled" ? "filled" : "submitted";
  } catch {
    // reconcile next tick
  }
  return "submitted";
}

function heartbeatTitle(plan: TickPlan, watching: string, submitted: number, stale: boolean) {
  const f = plan.floor;
  const pnl = `${f.dayPnl >= 0 ? "+" : "−"}$${Math.abs(f.dayPnl).toFixed(2)}`;
  if (plan.halted) return `Kill switch ON — watching only · ${watching}`;
  const capped = plan.desks.filter((d) => d.atLossCap).map((d) => d.name);
  return `Tick · ${submitted} order${submitted === 1 ? "" : "s"} · floor today ${pnl} · ${f.openPositions} open · US stocks ${plan.session}${capped.length ? ` · LOSS CAP: ${capped.join(", ")}` : ""}${stale ? " · DATA STALE" : ""} · ${watching}`;
}

/** Desk audit fields stored on the heartbeat row (log only; the UI computes desk views from the ledger in state.ts). */
function heartbeatDesks(plan: TickPlan) {
  return plan.desks.map((d) => ({
    id: d.id,
    strategy: d.strategy,
    spec: d.spec ? d.spec.name : null,
    dayLossLimitPct: d.dayLossLimitPct,
    atLossCap: d.atLossCap,
    enabled: d.enabled,
    equity: d.marked.equity,
    dayPnl: d.dayPnl,
    dayPnlPct: d.dayPnlPct,
    openPositions: d.marked.positions.length,
    pausedUntil: d.pausedUntil,
    entriesBlocked: d.entriesBlocked,
  }));
}

/**
 * NO OWN ACCOUNT: the floor's Alpaca keys are missing. No broker call of any kind; desks are marked at cost from
 * their own ledgers so the UI keeps showing them; a heartbeat + (hourly) system event make the state visible.
 */
async function runWithoutAccount(db: SupabaseClient, log: EventLog, now: number, started: number, clock: () => number) {
  const [params, desks, filledOrders, recentOrders, baselines] = await Promise.all([
    loadParams(db),
    loadDesks(db),
    loadFilledOrders(db),
    loadRecentOrders(db, new Date(now - 72 * HOUR_MS).toISOString()),
    loadBaselines(db, utcDay(now)),
  ]);
  // Planned with the kill switch forced on and no market data: produces desk views only, never an order.
  const plan = planTick({ now, params: { ...params, halted: true }, desks, experiments: [], universe: [], bars: new Map(), prices: new Map(), dataStale: true, dataStaleReason: "no own account", filledOrders, recentOrders, baselines, brokerQty: new Map(), brokerKnown: false, buyingPower: null });
  const { data: last } = await db.from("crypto_floor_events").select("ts").eq("type", "system").contains("payload", { noOwnAccount: true }).gte("ts", new Date(now - HOUR_MS).toISOString()).limit(1);
  if (!last?.length) await log.log({ type: "system", agentRole: "system", title: `Floor not trading — ${NO_OWN_ACCOUNT_MESSAGE}`, payload: { noOwnAccount: true } });
  await log.log({
    type: "heartbeat",
    agentRole: "system",
    title: "NO OWN ACCOUNT — floor not trading. Set CRYPTO_FLOOR_ALPACA_API_KEY / CRYPTO_FLOOR_ALPACA_SECRET_KEY (new Alpaca paper account).",
    payload: {
      noOwnAccount: true,
      dedicatedAccount: false,
      noOwnAccountMessage: NO_OWN_ACCOUNT_MESSAGE,
      watching: [],
      watchingWide: [],
      prices: {},
      dataStale: false,
      staleSymbols: [],
      dataStaleReason: null,
      halted: params.halted,
      session: plan.session,
      floor: plan.floor,
      desks: heartbeatDesks(plan),
      account: null,
      orders: { planned: 0, submitted: 0, filled: 0, rejected: 0, shadow: 0 },
      reconciled: 0,
      durationMs: clock() - started,
    },
  });
  return plan;
}

export async function runTick(deps: TickDeps): Promise<TickResult> {
  const clock = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const started = clock();
  const { db, alpaca } = deps;
  const log = new EventLog(db);
  const holder = `tick-${started}-${Math.random().toString(36).slice(2, 8)}`;
  const result = blank();
  const finish = (extra: Partial<TickResult> & { ok: boolean }): TickResult => ({
    ...result,
    ...extra,
    eventsWritten: log.written,
    eventErrors: log.errors,
    lastEventError: log.lastError,
    durationMs: clock() - started,
  });

  if ((deps.tradeMode ?? process.env.TRADE_MODE ?? "").trim().toLowerCase() !== "paper") {
    await log.log({ type: "system", agentRole: "system", title: "Tick refused: TRADE_MODE must be paper" });
    return finish({ ok: false, error: "TRADE_MODE must be paper" });
  }

  let leased = false;
  try {
    leased = await acquireTickLease(db, holder, started);
    if (!leased) return finish({ ok: true, skipped: "Another tick is running (lease held)" });

    if (!alpaca) {
      const plan = await runWithoutAccount(db, log, clock(), started, clock);
      return finish({ ok: true, noOwnAccount: true, dedicatedAccount: false, floor: plan.floor, session: plan.session, skipped: NO_OWN_ACCOUNT_MESSAGE });
    }

    result.reconciled = await reconcile(db, alpaca, log, started);

    const now = clock();
    const params = await loadParams(db);
    const [desks, experiments, account, brokerPositions, marketClock] = await Promise.all([
      loadDesks(db),
      loadExperiments(db, ["running"]),
      alpaca.account(),
      alpaca.positions(),
      alpaca.clock().catch(() => null),
    ]);
    const session = sessionWithClock(now, marketClock ? marketClock.is_open === true : null);
    // Only coins Alpaca lists (Awad's watch list may include coins Alpaca doesn't carry — those are skipped, not "stale").
    const wanted = floorUniverse([...desks, ...experiments]);
    const universe = await alpaca.listedPairs(wanted);
    const notOnAlpaca = wanted.filter((s) => !universe.includes(s));
    const coreUniverse = DEFAULT_UNIVERSE.filter((s) => universe.includes(s));
    const assetRules = await alpaca.cryptoAssets();

    // Market data: 8 days of hourly bars (EMA50 warm-up + 24h windows), only closed hours.
    let dataStaleReason: string | null = null;
    const bars = new Map<string, Bar[]>();
    try {
      const raw = await alpaca.bars(universe, new Date(now - 8 * 24 * HOUR_MS));
      for (const s of universe) bars.set(s, closedBars(raw.get(s) ?? [], now));
    } catch (err) {
      dataStaleReason = `bars fetch failed (${err instanceof Error ? err.message.slice(0, 120) : "error"})`;
    }
    let trades = new Map<string, { price: number; at: string }>();
    try {
      trades = await alpaca.latestTrades(universe);
    } catch {
      // Prices fall back to the last closed bar; signals only use closed bars anyway.
    }
    const dataStale = dataStaleReason !== null; // the fetch itself failed → no entries anywhere
    const prices = new Map<string, number>();
    const watching: WatchStat[] = [];
    const staleSymbols = new Set<string>();
    const staleNotes: string[] = [];
    for (const s of universe) {
      const b = bars.get(s) ?? [];
      const last = b.at(-1);
      const lastBarEnd = last ? Date.parse(last.timestamp) + HOUR_MS : 0;
      const tradeRaw = trades.get(s) ?? null;
      // Use the live trade only when it is newer than the last closed bar; otherwise the bar close.
      const live = tradeRaw && Date.parse(tradeRaw.at) >= lastBarEnd - HOUR_MS ? tradeRaw : null;
      const stat = watchStat(s, b, live);
      watching.push(stat);
      if (stat.price) prices.set(s, stat.price);
      if (!last || now - lastBarEnd > STALE_BAR_MS) {
        staleSymbols.add(s);
        staleNotes.push(`${s}: no closed hourly bar in 3h`);
      } else if (tradeRaw && now - Date.parse(tradeRaw.at) > STALE_TRADE_MS) {
        staleSymbols.add(s);
        staleNotes.push(`${s}: last trade older than 2h`);
      }
    }
    // 15-minute crypto bars (scalp-v1), 2 days, closed bars only. Failure → scalping just sees no bars.
    const bars15m = new Map<string, Bar[]>();
    try {
      const raw15 = await alpaca.bars(coreUniverse, new Date(now - 2 * 24 * HOUR_MS), "15Min");
      for (const s of coreUniverse) bars15m.set(s, closedBars(raw15.get(s) ?? [], now, MIN15_MS));
    } catch {
      // no scalp entries this tick
    }

    // Stocks (desks with stocks + the options lane's underlyings). Failure → those symbols are stale, crypto unaffected.
    const wantsStocks = desks.some((d) => d.enabled && (deskAssets(d.id).stocks || deskAssets(d.id).options));
    const stockSymbols = wantsStocks ? [...new Set<string>([...STOCK_UNIVERSE, ...OPTION_UNDERLYINGS])] : [];
    const stockUniverse: string[] = [];
    if (stockSymbols.length) {
      let sBars = new Map<string, Bar[]>();
      let sTrades = new Map<string, { price: number; at: string }>();
      try {
        sBars = await alpaca.stockBars(stockSymbols, new Date(now - 8 * 24 * HOUR_MS));
      } catch (err) {
        staleNotes.push(`stocks: bars fetch failed (${err instanceof Error ? err.message.slice(0, 80) : "error"})`);
      }
      try {
        sTrades = await alpaca.latestStockTrades(stockSymbols);
      } catch {
        // prices fall back to the last closed bar
      }
      for (const s of stockSymbols) {
        const b = closedBars(sBars.get(s) ?? [], now);
        if (!b.length) continue;
        bars.set(s, b);
        stockUniverse.push(s);
        const t = sTrades.get(s) ?? null;
        const stat = watchStat(s, b, t);
        watching.push(stat);
        if (stat.price) prices.set(s, stat.price);
        if (session !== "closed" && (!t || now - Date.parse(t.at) > STOCK_STALE_TRADE_MS)) {
          staleSymbols.add(s);
          staleNotes.push(`${s}: no trade in 30 min during the ${session} session`);
        }
      }
    }
    if (!dataStale && staleNotes.length) dataStaleReason = staleNotes.join("; ");

    // Broker holdings of the floor's OWN account, LONG only, keyed by floor symbol. Used only to cap the floor's own
    // sells and to reconcile its own books — a symbol the floor never opened is never looked up.
    const brokerQty = new Map<string, number>();
    for (const p of brokerPositions) {
      const sym = (p.asset_class ?? "").includes("crypto") || p.symbol.includes("/") ? normalizePair(p.symbol) : p.symbol.toUpperCase();
      const q = Number(p.qty_available ?? p.qty) || 0;
      if (p.side === "short" || q <= 0) continue;
      brokerQty.set(sym, q);
    }
    const bp = Number(account.non_marginable_buying_power ?? account.cash);

    const day = utcDay(now);
    const [filledOrders, recentOrders, baselines] = await Promise.all([
      loadFilledOrders(db),
      loadRecentOrders(db, new Date(now - 72 * HOUR_MS).toISOString()),
      loadBaselines(db, day),
    ]);

    // Options: quotes for contracts the floor holds (per-contract price = mid × 100), and chains for new entries.
    const heldOptions = new Set<string>();
    for (const [id, book] of buildBooks(filledOrders.filter(floorOwnedOrder))) {
      if (id.startsWith("exp:") || id.startsWith("live:")) continue;
      for (const sym of book.positions.keys()) if (assetClass(sym) === "option") heldOptions.add(sym);
    }
    if (heldOptions.size) {
      try {
        const snaps = await alpaca.optionSnapshots([...heldOptions]);
        for (const [sym, q] of snaps) {
          const px = q.mid ?? (q.bid > 0 ? q.bid : null);
          if (px) prices.set(sym, px * 100);
        }
      } catch {
        // held options keep their cost (unrealized 0) this tick
      }
    }
    const optionChains = new Map<string, OptionCandidate[]>();
    const optionsDeskOn = desks.some((d) => d.enabled && deskAssets(d.id).options && !d.paused_until);
    if (session === "regular" && optionsDeskOn && !params.halted) {
      const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
      for (const u of OPTION_UNDERLYINGS) {
        const px = prices.get(u);
        if (!px) continue;
        try {
          const snaps = await alpaca.optionChain(u, { expirationGte: ymd(now + OPTION_DTE_MIN * 86_400_000), expirationLte: ymd(now + OPTION_DTE_MAX * 86_400_000), strikeGte: Math.floor(px * 0.95), strikeLte: Math.ceil(px * 1.05) });
          optionChains.set(u, snaps.flatMap((q) => {
            const occ = parseOcc(q.symbol);
            return occ ? [{ symbol: q.symbol, right: occ.right, strike: occ.strike, expiration: occ.expiration, bid: q.bid, ask: q.ask }] : [];
          }));
        } catch {
          // no options entries on this underlying this tick
        }
      }
    }

    const plan = planTick({
      now,
      params,
      desks,
      experiments,
      universe: coreUniverse,
      bars,
      prices,
      dataStale,
      dataStaleReason,
      staleSymbols,
      filledOrders,
      recentOrders,
      baselines,
      brokerQty,
      brokerKnown: true,
      buyingPower: Number.isFinite(bp) ? bp : null,
      stockUniverse,
      bars15m,
      session,
      optionChains,
    });

    await writeBaselines(db, day, plan.baselinesToWrite);

    // Broker reconcile (floor positions only): record cleared ghost claims BEFORE any order. No sell is sent.
    for (const [i, row] of plan.reconcileRows.entries()) {
      const a = plan.reconcile[i];
      const ins = await db.from("crypto_floor_orders").insert({
        client_order_id: row.client_order_id,
        book: row.book,
        desk: row.desk,
        strategy: row.strategy,
        mode: "paper",
        venue: "sim",
        symbol: row.symbol,
        side: "sell",
        intent: "exit",
        qty: row.qty,
        status: "filled",
        filled_qty: row.filled_qty,
        filled_avg_price: row.filled_avg_price,
        filled_at: row.filled_at,
        reason: row.reason,
        signal: { reconcile: true, claimedQty: a.claimedQty, bookQty: a.bookQty, brokerQty: a.brokerQty },
      });
      if (ins.error && ins.error.code !== "23505") {
        await log.log({ type: "system", agentRole: "system", desk: a.book, symbol: a.symbol, title: `Reconcile write failed for ${a.book} ${a.symbol}: ${ins.error.message}` });
        continue;
      }
      await log.log({ type: "reconcile", agentRole: "risk", desk: a.book === "manual" ? null : a.book, strategy: a.strategy, symbol: a.symbol, side: "sell", qty: a.reduceBy, price: a.price, orderId: row.client_order_id, title: `${a.book.toUpperCase()}: ${a.reason}`, payload: { claimedQty: a.claimedQty, bookQty: a.bookQty, brokerQty: a.brokerQty, reduceBy: a.reduceBy, noBrokerOrder: true, agent: agentForEvent(a.book, "risk") } });
    }

    // Pauses / resumes
    if (plan.floorResume) {
      // The floor-wide day pause is retired (2026-10-02): only per-desk loss caps + the kill switch pause trading.
      await db.from("crypto_floor_params").update({ day_paused_until: null, day_pause_reason: null }).eq("id", 1);
      await log.log({ type: "resume", agentRole: "risk", title: "Floor-wide day pause retired — per-desk loss caps now guard each desk", payload: { scope: "floor" } });
    }
    for (const p of plan.deskPauses) {
      await db.from("crypto_floor_desks").update({ paused_until: p.until, pause_reason: p.reason, updated_at: new Date().toISOString() }).eq("id", p.desk);
      await log.log({ type: "halt", agentRole: "risk", desk: p.desk, title: `${p.desk.toUpperCase()}: ${p.reason}`, payload: { scope: "desk", lossCap: true, until: p.until, agent: agentForEvent(p.desk, "risk") } });
    }
    for (const d of plan.deskResumes) {
      await db.from("crypto_floor_desks").update({ paused_until: null, pause_reason: null, updated_at: new Date().toISOString() }).eq("id", d);
      await log.log({ type: "resume", agentRole: "risk", desk: d, title: `${d.toUpperCase()}: new UTC day — entries resume`, payload: { scope: "desk" } });
    }

    const staleTitleNow = dataStale || staleSymbols.size ? (dataStale ? "all" : [...staleSymbols].sort().join(",")) : null;
    const { data: lastStale } = staleTitleNow
      ? await db.from("crypto_floor_events").select("payload").eq("type", "data_stale").gte("ts", new Date(now - HOUR_MS).toISOString()).order("ts", { ascending: false }).limit(1)
      : { data: null };
    if (staleTitleNow && (lastStale?.[0]?.payload as Record<string, unknown> | undefined)?.key !== staleTitleNow) {
      await log.log({
        type: "data_stale",
        agentRole: "system",
        title: dataStale ? `Market data unavailable — all new entries blocked: ${dataStaleReason}` : `Stale data, no new entries in ${[...staleSymbols].join(", ")}: ${dataStaleReason}`,
        payload: { key: staleTitleNow },
      });
    }

    // Signals (paper desks). Repeated *skipped* signals are logged at most once an hour per desk/coin/reason.
    const { data: recentSignalRows } = await db
      .from("crypto_floor_events")
      .select("desk,symbol,side,payload")
      .eq("type", "signal")
      .gte("ts", new Date(now - HOUR_MS).toISOString())
      .limit(500);
    const seen = new Set(
      (recentSignalRows ?? []).map((r) => `${r.desk}|${r.symbol}|${r.side}|${(r.payload as Record<string, unknown>)?.skipReason ?? ""}`),
    );
    for (const s of plan.signals.filter((x) => x.mode === "paper")) {
      result.signals++;
      const key = `${s.desk}|${s.signal.symbol}|${s.signal.side}|${s.skipReason ?? ""}`;
      if (s.action === "skipped" && seen.has(key)) continue;
      const role = s.signal.side === "buy" ? "scout" : /stop/i.test(s.signal.reason) ? "risk" : "analyst";
      await log.log({
        type: "signal",
        agentRole: role,
        desk: s.desk,
        strategy: s.strategy,
        symbol: s.signal.symbol,
        side: s.signal.side,
        qty: typeof s.signal.qty === "number" ? s.signal.qty : null,
        title: `${s.desk.toUpperCase()} ${s.signal.type}: ${s.signal.reason}${s.action === "skipped" ? ` — skipped (${s.skipReason})` : ""}`,
        payload: { signalType: s.signal.type, reason: s.signal.reason, action: s.action, skipReason: s.skipReason ?? null, agent: agentForEvent(s.desk, role) },
      });
    }

    // Paper orders
    result.ordersPlanned = plan.orders.length;
    for (const o of plan.orders) {
      const rule = o.assetClass === "crypto" ? assetRules?.get(o.symbol) : undefined;
      if (rule) {
        o.qty = roundQty(o.qty, rule.minTradeIncrement);
        if (!(o.qty > 0) || o.qty < rule.minOrderSize) {
          await log.log({ type: "signal", agentRole: "trader", desk: o.desk, strategy: o.strategy, symbol: o.symbol, side: o.side, title: `${o.desk.toUpperCase()} ${o.side} ${o.symbol} skipped: below Alpaca's minimum order size (${rule.minOrderSize})`, payload: { action: "skipped", skipReason: "below Alpaca minimum" } });
          continue;
        }
      }
      const r = await placePaperOrder(db, alpaca, log, o, sleep);
      if (r === "submitted" || r === "filled") result.ordersSubmitted++;
      if (r === "filled") result.ordersFilled++;
      if (r === "rejected") result.ordersRejected++;
    }

    // Shadow experiments
    for (const f of plan.shadowFills) {
      const nowIso = new Date().toISOString();
      const ins = await db.from("crypto_floor_orders").insert({
        client_order_id: f.clientOrderId,
        book: f.book,
        desk: f.desk,
        strategy: f.strategy,
        mode: "shadow",
        venue: "sim",
        symbol: f.symbol,
        side: f.side,
        intent: f.intent,
        qty: f.qty,
        status: "filled",
        filled_qty: f.qty,
        filled_avg_price: f.refPrice,
        filled_at: nowIso,
        reason: f.reason,
        signal: { ...f.signal, experimentId: f.experimentId },
      });
      if (ins.error) {
        if (ins.error.code !== "23505") await log.log({ type: "system", agentRole: "system", title: `Shadow fill write failed: ${ins.error.message}` });
        continue;
      }
      result.shadowFills++;
      await log.log({
        type: "shadow_fill",
        agentRole: "trader",
        desk: f.desk,
        strategy: f.strategy,
        symbol: f.symbol,
        side: f.side,
        qty: f.qty,
        price: f.refPrice,
        orderId: f.clientOrderId,
        title: `TEST ${f.experimentId?.slice(0, 8)} · ${f.side.toUpperCase()} ${formatQty(f.qty)} ${f.symbol} @ ${f.refPrice.toFixed(2)} (simulated) — ${f.reason}`,
        payload: { experimentId: f.experimentId, sim: true, intent: f.intent },
      });
    }
    for (const e of plan.experimentsToStop) {
      await db.from("crypto_floor_experiments").update({ status: "stopped", ended_at: new Date().toISOString(), notes: e.reason }).eq("id", e.id).eq("status", "running");
      await log.log({ type: "experiment", agentRole: "analyst", title: `Strategy test ${e.id.slice(0, 8)} finished: ${e.reason}`, payload: { experimentId: e.id, status: "stopped" } });
    }

    // REAL MONEY step (Coinbase). With every desk's real-money switch OFF this only reads balances/status.
    let live: LiveSummary | null = null;
    try {
      let cbClient: CoinbaseClient | null = null;
      if (deps.coinbase !== undefined) cbClient = deps.coinbase;
      else {
        const cfg = coinbaseConfig();
        cbClient = cfg ? new CoinbaseClient(cfg) : null;
      }
      live = (
        await runLiveStep({
          db,
          client: cbClient,
          log,
          now,
          day,
          params,
          desks,
          universe,
          coreUniverse,
          bars,
          prices,
          dataStale,
          staleSymbols,
          filledOrders,
          recentOrders,
          baselines,
          sleep,
        })
      ).summary;
    } catch (err) {
      await log.log({ type: "system", agentRole: "system", title: `Real-money step failed (no real orders sent this tick): ${err instanceof Error ? err.message.slice(0, 300) : String(err)}`, payload: { live: true } });
    }

    // Heartbeat: proves the robot is alive and feeds the "Watching" line + robot status in the UI.
    const line = watchLine(watching.filter((w) => coreUniverse.includes(w.symbol)));
    await log.log({
      type: "heartbeat",
      agentRole: "system",
      title: heartbeatTitle(plan, line, result.ordersSubmitted, dataStale || staleSymbols.size > 0),
      payload: {
        watching: watching.filter((w) => coreUniverse.includes(w.symbol)),
        watchingWide: watching.filter((w) => !coreUniverse.includes(w.symbol)),
        universe,
        notOnAlpaca,
        prices: Object.fromEntries(prices),
        dataStale: dataStale || staleSymbols.size > 0,
        staleSymbols: [...staleSymbols],
        dataStaleReason,
        halted: plan.halted,
        floor: plan.floor,
        noOwnAccount: false,
        session: plan.session,
        desks: heartbeatDesks(plan),
        experiments: plan.experiments.map((e) => ({ id: e.id, equity: e.marked.equity, open: e.marked.positions.length })),
        account: { cash: Number(account.cash), equity: Number(account.equity), buyingPower: Number.isFinite(bp) ? bp : null },
        dedicatedAccount: alpaca.dedicated,
        coinbase: live,
        orders: { planned: result.ordersPlanned, submitted: result.ordersSubmitted, filled: result.ordersFilled, rejected: result.ordersRejected, shadow: result.shadowFills },
        reconciled: result.reconciled,
        eventErrorsSoFar: log.errors,
        durationMs: clock() - started,
      },
    });

    await db.from("crypto_floor_snapshot").insert({
      cash: Number(account.cash),
      portfolio_value: Number(account.portfolio_value),
      equity: Number(account.equity),
      positions: brokerPositions,
      orders: [],
      fetched_at: new Date().toISOString(),
    });

    return finish({
      ok: true,
      halted: plan.halted,
      dataStale,
      floor: plan.floor,
      watching: line,
      dedicatedAccount: alpaca.dedicated,
      noOwnAccount: false,
      session: plan.session,
      reconciled_positions: plan.reconcile.length,
      coinbase: live ? { configured: live.configured, ok: live.ok, error: live.error, canTrade: live.canTrade, canTransfer: live.canTransfer, enabledDesks: live.enabledDesks, blocked: live.blocked, orders: live.orders } : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await log.log({ type: "system", agentRole: "system", title: `Tick error: ${message.slice(0, 400)}`, payload: { stack: err instanceof Error ? err.stack?.slice(0, 2000) : null } });
    return finish({ ok: false, error: message });
  } finally {
    if (leased) await releaseTickLease(db, holder).catch(() => undefined);
  }
}
