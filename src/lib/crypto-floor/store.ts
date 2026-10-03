import type { SupabaseClient } from "@supabase/supabase-js";
import { DESK_IDS, type DeskRow, type ExperimentRow, type FloorParamsRow, type OrderRow } from "./types";

/** Typed reads/writes for the robot tables (public schema, service role). Server only. */

const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function toOrderRow(r: Record<string, unknown>): OrderRow {
  return {
    client_order_id: String(r.client_order_id),
    created_at: String(r.created_at),
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
    book: String(r.book),
    desk: (r.desk as string) ?? null,
    strategy: (r.strategy as string) ?? null,
    mode: r.mode === "shadow" ? "shadow" : r.mode === "live" ? "live" : "paper",
    venue: (r.venue as OrderRow["venue"]) ?? undefined,
    venue_order_id: (r.venue_order_id as string) ?? null,
    fees: r.fees === null || r.fees === undefined ? null : num(r.fees),
    symbol: String(r.symbol),
    side: r.side === "sell" ? "sell" : "buy",
    intent: (r.intent as OrderRow["intent"]) ?? null,
    qty: num(r.qty),
    status: r.status as OrderRow["status"],
    alpaca_order_id: (r.alpaca_order_id as string) ?? null,
    filled_qty: num(r.filled_qty),
    filled_avg_price: r.filled_avg_price === null || r.filled_avg_price === undefined ? null : num(r.filled_avg_price),
    filled_at: (r.filled_at as string) ?? null,
    reason: (r.reason as string) ?? null,
    error: (r.error as string) ?? null,
  };
}

export async function loadParams(db: SupabaseClient): Promise<FloorParamsRow> {
  const { data, error } = await db.from("crypto_floor_params").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(`Params read failed: ${error.message}`);
  if (!data) throw new Error("Params not found (crypto_floor_params id=1)");
  return {
    id: 1,
    version: num(data.version, 1),
    halted: data.halted === true,
    halt_reason: data.halt_reason ?? null,
    halted_at: data.halted_at ?? null,
    halted_by: data.halted_by ?? null,
    halt_day_loss_pct: num(data.halt_day_loss_pct, -2),
    day_paused_until: data.day_paused_until ?? null,
    day_pause_reason: data.day_pause_reason ?? null,
    max_open_positions_total: num(data.max_open_positions_total, 8),
    max_orders_per_tick: num(data.max_orders_per_tick, 3),
    live_max_total_usd: num(data.live_max_total_usd, 100),
    live_max_trade_usd: num(data.live_max_trade_usd, 25),
    live_day_loss_usd: num(data.live_day_loss_usd, 10),
    live_paused_until: data.live_paused_until ?? null,
    live_pause_reason: data.live_pause_reason ?? null,
    updated_at: data.updated_at ?? new Date(0).toISOString(),
  };
}

export async function loadDesks(db: SupabaseClient): Promise<DeskRow[]> {
  const { data, error } = await db.from("crypto_floor_desks").select("*");
  if (error) throw new Error(`Desks read failed: ${error.message}`);
  const rows = (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    strategy: d.strategy,
    enabled: d.enabled !== false,
    capital_usd: num(d.capital_usd, 25000),
    params: (d.params ?? {}) as DeskRow["params"],
    version: num(d.version, 1),
    paused_until: d.paused_until ?? null,
    pause_reason: d.pause_reason ?? null,
    live_enabled: d.live_enabled === true,
    live_enabled_at: d.live_enabled_at ?? null,
    live_enabled_by: d.live_enabled_by ?? null,
    // Owner/migration-set hard risk limits (desk loss cap %, options max loss). Read-only for agents and the lab.
    risk: d.risk && typeof d.risk === "object" ? (d.risk as DeskRow["risk"]) : null,
    updated_at: d.updated_at,
  })) as DeskRow[];
  return rows.sort((a, b) => DESK_IDS.indexOf(a.id) - DESK_IDS.indexOf(b.id));
}

export async function loadExperiments(db: SupabaseClient, statuses?: ExperimentRow["status"][]): Promise<ExperimentRow[]> {
  let q = db.from("crypto_floor_experiments").select("*").order("created_at", { ascending: false }).limit(100);
  if (statuses) q = q.in("status", statuses);
  const { data, error } = await q;
  if (error) throw new Error(`Experiments read failed: ${error.message}`);
  return (data ?? []).map((e) => ({ ...e, capital_usd: num(e.capital_usd, 25000) })) as ExperimentRow[];
}

/** Every order that has filled any quantity (the ledgers' input). Paged. */
export async function loadFilledOrders(db: SupabaseClient, modes: Array<"paper" | "shadow" | "live"> = ["paper", "shadow", "live"]): Promise<OrderRow[]> {
  const out: OrderRow[] = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await db
      .from("crypto_floor_orders")
      .select("*")
      .gt("filled_qty", 0)
      .in("mode", modes)
      .order("created_at", { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(`Orders read failed: ${error.message}`);
    out.push(...(data ?? []).map(toOrderRow));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function loadRecentOrders(db: SupabaseClient, sinceIso: string): Promise<OrderRow[]> {
  const { data, error } = await db
    .from("crypto_floor_orders")
    .select("*")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`Recent orders read failed: ${error.message}`);
  return (data ?? []).map(toOrderRow);
}

export async function loadOpenPaperOrders(db: SupabaseClient): Promise<OrderRow[]> {
  const { data, error } = await db
    .from("crypto_floor_orders")
    .select("*")
    .eq("mode", "paper")
    .in("status", ["pending_submit", "submitted", "partially_filled", "unknown"])
    .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
    .limit(100);
  if (error) throw new Error(`Open orders read failed: ${error.message}`);
  return (data ?? []).map(toOrderRow);
}

export async function loadBaselines(db: SupabaseClient, day: string): Promise<Map<string, number>> {
  const { data, error } = await db.from("crypto_floor_daily").select("book,start_equity").eq("day", day);
  if (error) throw new Error(`Daily baselines read failed: ${error.message}`);
  return new Map((data ?? []).map((r) => [String(r.book), num(r.start_equity)]));
}

export async function writeBaselines(db: SupabaseClient, day: string, rows: Array<{ book: string; equity: number }>) {
  if (!rows.length) return;
  const { error } = await db
    .from("crypto_floor_daily")
    .upsert(rows.map((r) => ({ day, book: r.book, start_equity: r.equity })), { onConflict: "day,book", ignoreDuplicates: true });
  if (error) throw new Error(`Daily baselines write failed: ${error.message}`);
}

/**
 * Single execution leader (ADD 6): a tick takes a 4-minute lease on the params row. A second tick that starts
 * while one is running (cron overlap, manual run) exits without trading.
 */
export async function acquireTickLease(db: SupabaseClient, holder: string, now: number, ttlMs = 4 * 60_000): Promise<boolean> {
  const nowIso = new Date(now).toISOString();
  const { data, error } = await db
    .from("crypto_floor_params")
    .update({ tick_lease_until: new Date(now + ttlMs).toISOString(), tick_lease_holder: holder })
    .eq("id", 1)
    .or(`tick_lease_until.is.null,tick_lease_until.lt."${nowIso}"`)
    .select("id");
  if (error) throw new Error(`Tick lease failed: ${error.message}`);
  return (data ?? []).length === 1;
}

export async function releaseTickLease(db: SupabaseClient, holder: string) {
  await db.from("crypto_floor_params").update({ tick_lease_until: null, tick_lease_holder: null }).eq("id", 1).eq("tick_lease_holder", holder);
}
