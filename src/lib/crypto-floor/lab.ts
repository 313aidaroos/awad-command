/**
 * Strategy lab + owner controls. Shared by the API routes and the desk agents' chat tools.
 *
 * Who can do what:
 * - Desk agents (chat tools): run backtests, start/stop SHADOW experiments (simulated fills, never sent to a broker).
 * - Owner only (UI buttons): promote an experiment's params onto a live paper desk, switch a desk on/off,
 *   kill switch on/off, manual orders. No AI path reaches these.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlpacaClient } from "./alpaca";
import { runBacktest, type BacktestResult } from "./backtest";
import { DESK_STRATEGY } from "./desks";
import { EventLog } from "./events";
import { HOUR_MS, closedBars } from "./market";
import { loadDesks, loadExperiments } from "./store";
import { DEFAULT_UNIVERSE, STRATEGIES, effectiveParams, validateParams } from "./strategies";
import { DESK_IDS, type Bar, type DeskId, type StrategyId, type StrategyParams } from "./types";

export const MAX_RUNNING_EXPERIMENTS = 6;
export const MAX_EXPERIMENT_DAYS = 30;
export const MAX_BACKTEST_DAYS = 90;

export class LabError extends Error {}

export function isDeskId(x: unknown): x is DeskId {
  return typeof x === "string" && (DESK_IDS as string[]).includes(x);
}

export async function loadHistory(alpaca: AlpacaClient, days: number, universe = DEFAULT_UNIVERSE, now = Date.now()): Promise<Map<string, Bar[]>> {
  const raw = await alpaca.bars(universe, new Date(now - days * 24 * HOUR_MS));
  const out = new Map<string, Bar[]>();
  for (const s of universe) out.set(s, closedBars(raw.get(s) ?? [], now));
  return out;
}

/** Backtest a desk's strategy with its current params plus optional overrides (validated against bounds). */
export async function backtestDesk(opts: {
  db: SupabaseClient;
  alpaca: AlpacaClient;
  desk: DeskId;
  overrides?: Record<string, unknown>;
  days?: number;
  history?: Map<string, Bar[]>;
}): Promise<{ result: BacktestResult; params: StrategyParams; baseline?: BacktestResult }> {
  const desks = await loadDesks(opts.db);
  const desk = desks.find((d) => d.id === opts.desk);
  if (!desk) throw new LabError(`Unknown desk ${opts.desk}`);
  const current = effectiveParams(desk.strategy, desk.params);
  const v = validateParams(desk.strategy, opts.overrides ?? {}, current);
  if (!v.ok) throw new LabError(v.errors.join("; "));
  const days = Math.max(3, Math.min(MAX_BACKTEST_DAYS, Math.round(opts.days ?? 30)));
  const history = opts.history ?? (await loadHistory(opts.alpaca, days));
  const result = runBacktest({ strategy: desk.strategy, params: v.params, bars: history, universe: DEFAULT_UNIVERSE, capital: desk.capital_usd });
  const changed = Object.keys(opts.overrides ?? {}).length > 0;
  const baseline = changed
    ? runBacktest({ strategy: desk.strategy, params: current, bars: history, universe: DEFAULT_UNIVERSE, capital: desk.capital_usd })
    : undefined;
  return { result, params: v.params, baseline };
}

export async function startExperiment(opts: {
  db: SupabaseClient;
  log: EventLog;
  desk: DeskId;
  name: string;
  hypothesis?: string | null;
  overrides: Record<string, unknown>;
  days?: number;
  proposedBy: string;
  backtest?: BacktestResult | null;
  now?: number;
}) {
  const now = opts.now ?? Date.now();
  const desks = await loadDesks(opts.db);
  const desk = desks.find((d) => d.id === opts.desk);
  if (!desk) throw new LabError(`Unknown desk ${opts.desk}`);
  const v = validateParams(desk.strategy, opts.overrides, effectiveParams(desk.strategy, desk.params));
  if (!v.ok) throw new LabError(v.errors.join("; "));
  const running = await loadExperiments(opts.db, ["running"]);
  if (running.length >= MAX_RUNNING_EXPERIMENTS) {
    throw new LabError(`${running.length} tests are already running (max ${MAX_RUNNING_EXPERIMENTS}). Stop one first.`);
  }
  const days = Math.max(1, Math.min(MAX_EXPERIMENT_DAYS, Math.round(opts.days ?? 7)));
  const name = opts.name.trim().slice(0, 80) || `${desk.name} test`;
  const { data, error } = await opts.db
    .from("crypto_floor_experiments")
    .insert({
      desk: desk.id,
      strategy: desk.strategy,
      name,
      hypothesis: opts.hypothesis?.slice(0, 500) ?? null,
      params: v.params,
      capital_usd: desk.capital_usd,
      status: "running",
      proposed_by: opts.proposedBy.slice(0, 80),
      started_at: new Date(now).toISOString(),
      ends_at: new Date(now + days * 24 * HOUR_MS).toISOString(),
      backtest: opts.backtest ?? null,
    })
    .select("*")
    .single();
  if (error) throw new LabError(`Could not save the test: ${error.message}`);
  const changed = Object.fromEntries(Object.keys(opts.overrides).map((k) => [k, v.params[k]]));
  await opts.log.log({
    type: "experiment",
    agentRole: "analyst",
    desk: desk.id,
    strategy: desk.strategy,
    title: `${opts.proposedBy} started test "${name}" on ${desk.name}: ${JSON.stringify(changed)} for ${days}d (shadow book, no broker orders)`,
    payload: { experimentId: data.id, status: "running", changed, hypothesis: opts.hypothesis ?? null, days },
  });
  return data as { id: string; name: string; ends_at: string };
}

export async function stopExperiment(db: SupabaseClient, log: EventLog, id: string, by: string, reason = "Stopped") {
  const { data, error } = await db
    .from("crypto_floor_experiments")
    .update({ status: "stopped", ended_at: new Date().toISOString(), notes: `${reason} by ${by}` })
    .eq("id", id)
    .in("status", ["running", "proposed"])
    .select("id,name,desk")
    .maybeSingle();
  if (error) throw new LabError(error.message);
  if (!data) throw new LabError("That test is not running.");
  await log.log({ type: "experiment", agentRole: "analyst", desk: data.desk, title: `Test "${data.name}" stopped by ${by}`, payload: { experimentId: id, status: "stopped" } });
  return data;
}

/** OWNER ONLY. Copies an experiment's params onto its live paper desk (version+1). */
export async function promoteExperiment(db: SupabaseClient, log: EventLog, id: string, by: string) {
  const { data: exp, error } = await db.from("crypto_floor_experiments").select("*").eq("id", id).maybeSingle();
  if (error || !exp) throw new LabError("Test not found.");
  if (!["running", "stopped"].includes(exp.status)) throw new LabError(`A ${exp.status} test cannot be promoted.`);
  const desks = await loadDesks(db);
  const desk = desks.find((d) => d.id === exp.desk);
  if (!desk) throw new LabError("Desk not found.");
  if (desk.strategy !== exp.strategy) throw new LabError("The desk now runs a different strategy.");
  const v = validateParams(desk.strategy, exp.params as Record<string, unknown>);
  if (!v.ok) throw new LabError(v.errors.join("; "));
  const before = effectiveParams(desk.strategy, desk.params);
  const version = desk.version + 1;
  const upd = await db.from("crypto_floor_desks").update({ params: v.params, version, updated_at: new Date().toISOString() }).eq("id", desk.id).eq("version", desk.version);
  if (upd.error) throw new LabError(upd.error.message);
  await db.from("crypto_floor_param_changes").insert({ desk: desk.id, version, source: "experiment", reason: `Promoted test "${exp.name}" (${id.slice(0, 8)}) by ${by}`, before, after: v.params });
  await db.from("crypto_floor_experiments").update({ status: "promoted", ended_at: new Date().toISOString(), notes: `Promoted by ${by}` }).eq("id", id);
  await log.log({ type: "param_change", agentRole: "analyst", desk: desk.id, strategy: desk.strategy, title: `${desk.name} now trades test "${exp.name}" settings (v${version}) — promoted by ${by}`, payload: { before, after: v.params, version, source: "experiment", experimentId: id } });
  return { desk: desk.id, version, params: v.params };
}

/** OWNER ONLY. */
export async function setDeskEnabled(db: SupabaseClient, log: EventLog, desk: DeskId, enabled: boolean, by: string) {
  const { error } = await db.from("crypto_floor_desks").update({ enabled, updated_at: new Date().toISOString() }).eq("id", desk);
  if (error) throw new LabError(error.message);
  await log.log({ type: enabled ? "resume" : "halt", agentRole: "risk", desk, title: `${desk.toUpperCase()} switched ${enabled ? "ON" : "OFF (no new entries; exits still run)"} by ${by}`, payload: { scope: "desk", owner: true } });
}

/**
 * OWNER ONLY. Kill switch: no orders of any kind until reset. Best-effort cancel of the robot's unfilled orders.
 */
export async function setKillSwitch(opts: { db: SupabaseClient; log: EventLog; alpaca: AlpacaClient | null; on: boolean; reason: string; by: string }) {
  const { db, log } = opts;
  const now = new Date().toISOString();
  const { error } = await db
    .from("crypto_floor_params")
    .update(opts.on ? { halted: true, halt_reason: opts.reason.slice(0, 300) || "Owner pressed the kill switch", halted_at: now, halted_by: opts.by, updated_at: now } : { halted: false, halt_reason: null, halted_at: null, halted_by: null, updated_at: now })
    .eq("id", 1);
  if (error) throw new LabError(error.message);
  let canceled = 0;
  if (opts.on && opts.alpaca) {
    const { data: open } = await db.from("crypto_floor_orders").select("client_order_id,alpaca_order_id").eq("mode", "paper").in("status", ["submitted", "partially_filled"]);
    for (const o of open ?? []) {
      if (!o.alpaca_order_id) continue;
      try {
        await opts.alpaca.cancelOrder(o.alpaca_order_id);
        canceled++;
      } catch {
        // already filled / gone — the next tick reconciles it
      }
    }
  }
  await log.log({
    type: opts.on ? "kill_switch" : "kill_reset",
    agentRole: "risk",
    title: opts.on ? `KILL SWITCH ON by ${opts.by}: ${opts.reason || "no reason given"}${canceled ? ` · ${canceled} open order(s) cancel requested` : ""}` : `Kill switch reset by ${opts.by} — robot may trade again`,
    payload: { by: opts.by, reason: opts.reason, canceled },
  });
  return { halted: opts.on, canceled };
}

export function strategyCatalog() {
  return DESK_IDS.map((desk) => {
    const s = STRATEGIES[DESK_STRATEGY[desk] as StrategyId];
    return { desk, strategy: s.id, label: s.label, summary: s.summary, defaults: s.defaults, bounds: s.bounds };
  });
}
