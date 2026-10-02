/**
 * Strategy lab + owner controls. Shared by the API routes and the desk agents' chat tools.
 *
 * Who can do what:
 * - Desk agents (chat + team meetings): run backtests, start/stop SHADOW experiments (simulated fills, never sent
 *   to a broker), and adopt a change on their own PAPER desk — only when the code-checked evidence gate passes
 *   (judgeBacktest / judgeExperiment), at most once per desk per 24h. A desk trading REAL money only proposes.
 * - Owner only (UI buttons): promote an experiment onto a desk, switch a desk on/off, kill switch on/off, manual
 *   orders, and everything REAL MONEY. No AI path reaches these.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlpacaClient } from "./alpaca";
import { runBacktest, type BacktestResult } from "./backtest";
import { DESK_STRATEGY } from "./desks";
import { EventLog } from "./events";
import { HOUR_MS, closedBars } from "./market";
import { buildBooks, emptyBook, markBook, tradeStats } from "./ledger";
import { writeNote } from "./notes";
import { loadDesks, loadExperiments, loadFilledOrders } from "./store";
import { DEFAULT_UNIVERSE, STRATEGIES, effectiveParams, resolveSpec, strategySummary, strategyUniverse, validateParams } from "./strategies";
import { RONIN_LIMITS, validateSpec, type CustomSpec } from "./strategy/custom-v1";
import { DESK_IDS, type Bar, type DeskId, type DeskRow, type StrategyId, type StrategyParams } from "./types";

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

/**
 * Hourly history fetched once and reused (a meeting runs several backtests). Fetches more coins or a longer window
 * only when asked for them.
 */
export class HistoryCache {
  private bars = new Map<string, Bar[]>();
  private days = 0;
  constructor(
    private alpaca: AlpacaClient,
    private now = Date.now(),
  ) {}
  async get(universe: string[], days: number): Promise<Map<string, Bar[]>> {
    if (days > this.days) {
      const all = [...new Set([...universe, ...this.bars.keys()])];
      this.bars = await loadHistory(this.alpaca, days, all, this.now);
      this.days = days;
    } else {
      const missing = universe.filter((s) => !this.bars.has(s));
      if (missing.length) for (const [k, v] of await loadHistory(this.alpaca, this.days, missing, this.now)) this.bars.set(k, v);
    }
    const cutoff = this.now - days * 24 * HOUR_MS;
    return new Map(universe.map((s) => [s, (this.bars.get(s) ?? []).filter((b) => Date.parse(b.timestamp) >= cutoff)]));
  }
}

/** A desk's candidate settings: params for core desks (inside bounds), a spec for custom-v1 (inside RONIN_LIMITS). */
export function candidateFor(desk: DeskRow, overrides: Record<string, unknown> | undefined, spec: unknown): { params: StrategyParams; spec: CustomSpec | null; changed: boolean } {
  const current = effectiveParams(desk.strategy, desk.params);
  if (desk.strategy === "custom-v1") {
    if (overrides && Object.keys(overrides).length) throw new LabError(`${desk.name} has no numeric settings — send a full strategy spec instead.`);
    if (spec === undefined || spec === null) return { params: current, spec: resolveSpec(desk.strategy, desk.spec), changed: false };
    const v = validateSpec(spec, RONIN_LIMITS);
    if (!v.ok) throw new LabError(`Strategy spec rejected: ${v.errors.join("; ")}`);
    return { params: current, spec: v.spec, changed: true };
  }
  if (spec !== undefined && spec !== null) throw new LabError(`${desk.name} trades ${desk.strategy}; only RONIN writes strategy specs. Send setting overrides instead.`);
  const v = validateParams(desk.strategy, overrides ?? {}, current);
  if (!v.ok) throw new LabError(v.errors.join("; "));
  return { params: v.params, spec: null, changed: Object.keys(overrides ?? {}).length > 0 };
}

/** Backtest a desk's strategy: current settings plus optional overrides (core) or a new spec (RONIN). */
export async function backtestDesk(opts: {
  db: SupabaseClient;
  alpaca: AlpacaClient;
  desk: DeskId;
  overrides?: Record<string, unknown>;
  spec?: unknown;
  days?: number;
  history?: HistoryCache;
}): Promise<{ result: BacktestResult; params: StrategyParams; spec: CustomSpec | null; baseline?: BacktestResult }> {
  const desks = await loadDesks(opts.db);
  const desk = desks.find((d) => d.id === opts.desk);
  if (!desk) throw new LabError(`Unknown desk ${opts.desk}`);
  const cand = candidateFor(desk, opts.overrides, opts.spec);
  const currentSpec = resolveSpec(desk.strategy, desk.spec);
  const days = Math.max(3, Math.min(MAX_BACKTEST_DAYS, Math.round(opts.days ?? 30)));
  const candUniverse = strategyUniverse(desk.strategy, cand.spec);
  const curUniverse = strategyUniverse(desk.strategy, currentSpec);
  const cache = opts.history ?? new HistoryCache(opts.alpaca);
  const history = await cache.get([...new Set([...candUniverse, ...curUniverse])], days);
  const result = runBacktest({ strategy: desk.strategy, params: cand.params, spec: cand.spec, bars: history, universe: candUniverse, capital: desk.capital_usd });
  const baseline = cand.changed
    ? runBacktest({ strategy: desk.strategy, params: effectiveParams(desk.strategy, desk.params), spec: currentSpec, bars: history, universe: curUniverse, capital: desk.capital_usd })
    : undefined;
  return { result, params: cand.params, spec: cand.spec, baseline };
}

export async function startExperiment(opts: {
  db: SupabaseClient;
  log: EventLog;
  desk: DeskId;
  name: string;
  hypothesis?: string | null;
  overrides: Record<string, unknown>;
  /** RONIN: the candidate strategy (rule language). */
  spec?: unknown;
  days?: number;
  proposedBy: string;
  backtest?: BacktestResult | null;
  /** 'proposed' = waiting for the owner (real-money desks); default 'running' (shadow test). */
  status?: "running" | "proposed";
  notes?: string | null;
  now?: number;
}) {
  const now = opts.now ?? Date.now();
  const desks = await loadDesks(opts.db);
  const desk = desks.find((d) => d.id === opts.desk);
  if (!desk) throw new LabError(`Unknown desk ${opts.desk}`);
  const cand = candidateFor(desk, opts.overrides, opts.spec);
  if (!cand.changed) throw new LabError(desk.strategy === "custom-v1" ? "A test needs a strategy spec." : "A test needs at least one changed setting.");
  const v = { params: cand.params };
  const running = await loadExperiments(opts.db, ["running"]);
  if (opts.status !== "proposed" && running.length >= MAX_RUNNING_EXPERIMENTS) {
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
      spec: cand.spec,
      capital_usd: desk.capital_usd,
      status: opts.status ?? "running",
      proposed_by: opts.proposedBy.slice(0, 80),
      started_at: opts.status === "proposed" ? null : new Date(now).toISOString(),
      ends_at: opts.status === "proposed" ? null : new Date(now + days * 24 * HOUR_MS).toISOString(),
      backtest: opts.backtest ?? null,
      notes: opts.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new LabError(`Could not save the test: ${error.message}`);
  const changed = cand.spec ? { spec: cand.spec.name } : Object.fromEntries(Object.keys(opts.overrides).map((k) => [k, v.params[k]]));
  await opts.log.log({
    type: "experiment",
    agentRole: "analyst",
    desk: desk.id,
    strategy: desk.strategy,
    title:
      opts.status === "proposed"
        ? `${opts.proposedBy} PROPOSED "${name}" for ${desk.name}: ${JSON.stringify(changed)} — waiting for Awad (Lab tab → promote)`
        : `${opts.proposedBy} started test "${name}" on ${desk.name}: ${JSON.stringify(changed)} for ${days}d (shadow book, no broker orders)`,
    payload: { experimentId: data.id, status: opts.status ?? "running", changed, hypothesis: opts.hypothesis ?? null, days },
  });
  return data as { id: string; name: string; ends_at: string | null };
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
  if (!["running", "stopped", "proposed"].includes(exp.status)) throw new LabError(`A ${exp.status} test cannot be promoted.`);
  const desks = await loadDesks(db);
  const desk = desks.find((d) => d.id === exp.desk);
  if (!desk) throw new LabError("Desk not found.");
  if (desk.strategy !== exp.strategy) throw new LabError("The desk now runs a different strategy.");
  const cand = candidateFor(desk, desk.strategy === "custom-v1" ? undefined : (exp.params as Record<string, unknown>), desk.strategy === "custom-v1" ? exp.spec : undefined);
  const v = { params: cand.params };
  const before = settingsOf(desk);
  const after = cand.spec ? { spec: cand.spec } : v.params;
  const version = desk.version + 1;
  const upd = await db.from("crypto_floor_desks").update({ ...(cand.spec ? { spec: cand.spec } : { params: v.params }), version, updated_at: new Date().toISOString() }).eq("id", desk.id).eq("version", desk.version);
  if (upd.error) throw new LabError(upd.error.message);
  await db.from("crypto_floor_param_changes").insert({ desk: desk.id, version, source: "experiment", reason: `Promoted test "${exp.name}" (${id.slice(0, 8)}) by ${by}`, before, after });
  await db.from("crypto_floor_experiments").update({ status: "promoted", ended_at: new Date().toISOString(), notes: `Promoted by ${by}` }).eq("id", id);
  await log.log({ type: "param_change", agentRole: "analyst", desk: desk.id, strategy: desk.strategy, title: `${desk.name} now trades test "${exp.name}" settings (v${version}) — promoted by ${by}`, payload: { before, after, version, source: "experiment", experimentId: id } });
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

/** What a desk trades right now, for change logs: params, or the spec for custom-v1. */
export function settingsOf(desk: DeskRow): Record<string, unknown> {
  const spec = resolveSpec(desk.strategy, desk.spec);
  return spec ? { spec } : effectiveParams(desk.strategy, desk.params);
}

// ── LEARNING: evidence-gated adoption ────────────────────────────────────────

export const GATE = {
  minTestTrades: 5,
  minBacktestTrades: 6,
  minEdgePct: 0.5,
  cooldownMs: 24 * HOUR_MS,
  drawdownCapPct: { ronin: 15, core: 8 },
  drawdownVsCurrent: 1.5,
  drawdownFloorPct: 2,
} as const;

export const drawdownCap = (desk: string) => (desk === "ronin" ? GATE.drawdownCapPct.ronin : GATE.drawdownCapPct.core);

type BtLite = Pick<BacktestResult, "returnPct" | "trades" | "expectancy" | "maxDrawdownPct">;

/** Backtest evidence: 30-day candidate vs current (all rules), plus 90 days not worse. Pure. */
export function judgeBacktest(desk: string, cand30: BtLite, cur30: BtLite, cand90?: BtLite | null, cur90?: BtLite | null): { ok: boolean; failures: string[] } {
  const f: string[] = [];
  const cap = drawdownCap(desk);
  if (cand30.trades < GATE.minBacktestTrades) f.push(`only ${cand30.trades} trades in 30 days (need ${GATE.minBacktestTrades})`);
  if (!(cand30.returnPct >= cur30.returnPct + GATE.minEdgePct)) f.push(`30-day return ${cand30.returnPct.toFixed(2)}% is not ≥ ${GATE.minEdgePct} points above the current ${cur30.returnPct.toFixed(2)}%`);
  if (!(cand30.expectancy !== null && cand30.expectancy > 0)) f.push("expectancy is not positive");
  if (cand30.maxDrawdownPct > cap) f.push(`drawdown ${cand30.maxDrawdownPct.toFixed(2)}% is over the ${cap}% team cap`);
  const rel = Math.max(cur30.maxDrawdownPct * GATE.drawdownVsCurrent, GATE.drawdownFloorPct);
  if (cand30.maxDrawdownPct > rel) f.push(`drawdown ${cand30.maxDrawdownPct.toFixed(2)}% is over ${rel.toFixed(2)}% (1.5× the current)`);
  if (cand90 && cur90) {
    if (cand90.returnPct < cur90.returnPct) f.push(`over 90 days it is worse than the current (${cand90.returnPct.toFixed(2)}% vs ${cur90.returnPct.toFixed(2)}%)`);
    if (cand90.maxDrawdownPct > cap) f.push(`90-day drawdown ${cand90.maxDrawdownPct.toFixed(2)}% is over the ${cap}% team cap`);
  }
  return { ok: f.length === 0, failures: f };
}

/** Forward-test evidence (shadow book vs the desk over the same period). Pure. */
export function judgeExperiment(t: { trades: number; expectancy: number | null; returnPct: number; deskReturnPct: number | null }): { ok: boolean; failures: string[] } {
  const f: string[] = [];
  if (t.trades < GATE.minTestTrades) f.push(`only ${t.trades} closed test trades (need ${GATE.minTestTrades})`);
  if (!(t.expectancy !== null && t.expectancy > 0)) f.push("test expectancy is not positive");
  if (t.deskReturnPct === null || !(t.returnPct > t.deskReturnPct)) f.push(`test return ${t.returnPct.toFixed(2)}% does not beat the desk's ${t.deskReturnPct === null ? "n/a" : `${t.deskReturnPct.toFixed(2)}%`} over the same period`);
  return { ok: f.length === 0, failures: f };
}

export type AdoptResult = { adopted: boolean; proposed?: boolean; message: string; version?: number; experimentId?: string };

/**
 * A team adopts a change on its own PAPER desk. The code — not the agent — decides whether the evidence is good
 * enough (judgeExperiment / judgeBacktest). One adoption per desk per 24h. A desk with REAL money switched on only
 * gets a proposal (a 'proposed' test the owner can promote).
 */
export async function adoptChange(opts: {
  db: SupabaseClient;
  alpaca: AlpacaClient | null;
  log: EventLog;
  desk: DeskId;
  by: string;
  reason: string;
  experimentId?: string | null;
  overrides?: Record<string, unknown>;
  spec?: unknown;
  history?: HistoryCache;
  now?: number;
}): Promise<AdoptResult> {
  const now = opts.now ?? Date.now();
  const { db, log } = opts;
  const desks = await loadDesks(db);
  const desk = desks.find((d) => d.id === opts.desk);
  if (!desk) throw new LabError(`Unknown desk ${opts.desk}`);

  const { data: recent } = await db
    .from("crypto_floor_param_changes")
    .select("created_at")
    .eq("desk", desk.id)
    .eq("source", "research")
    .gte("created_at", new Date(now - GATE.cooldownMs).toISOString())
    .limit(1);
  if (recent?.length) {
    return { adopted: false, message: `${desk.name} already adopted a change at ${String(recent[0].created_at).slice(0, 16)} UTC. One change per 24h so each one can be judged — keep testing and adopt after the cooldown.` };
  }

  let cand: { params: StrategyParams; spec: CustomSpec | null; changed: boolean };
  let evidence: Record<string, unknown>;
  let label: string;
  if (opts.experimentId) {
    const { data: exp } = await db.from("crypto_floor_experiments").select("*").eq("id", opts.experimentId).maybeSingle();
    if (!exp || exp.desk !== desk.id) throw new LabError("That test does not belong to this desk.");
    if (exp.strategy !== desk.strategy) throw new LabError("The desk now runs a different strategy than that test.");
    if (!["running", "stopped"].includes(exp.status)) throw new LabError(`A ${exp.status} test cannot be adopted.`);
    cand = candidateFor(desk, desk.strategy === "custom-v1" ? undefined : (exp.params as Record<string, unknown>), desk.strategy === "custom-v1" ? exp.spec : undefined);
    const filled = await loadFilledOrders(db, ["paper", "shadow"]);
    const books = buildBooks(filled);
    const start = Date.parse(exp.started_at ?? exp.created_at);
    const marked = markBook(books.get(`exp:${exp.id}`) ?? emptyBook(`exp:${exp.id}`), Number(exp.capital_usd), new Map());
    const st = tradeStats(marked.closedTrades);
    const deskTrades = tradeStats((books.get(desk.id) ?? emptyBook(desk.id)).closedTrades, start);
    const t = { trades: st.trades, expectancy: st.expectancy, returnPct: (st.realized / Number(exp.capital_usd)) * 100, deskReturnPct: (deskTrades.realized / desk.capital_usd) * 100 };
    const j = judgeExperiment(t);
    evidence = { kind: "forward_test", experimentId: exp.id, ...t };
    if (!j.ok) return { adopted: false, message: `Not adopted — the evidence gate said no: ${j.failures.join("; ")}.` };
    label = `test "${exp.name}"`;
  } else {
    cand = candidateFor(desk, opts.overrides, opts.spec);
    if (!cand.changed) throw new LabError("Nothing to adopt: send changed settings, a spec (RONIN) or a test id.");
    if (!opts.alpaca) return { adopted: false, message: "Market history is unavailable (Alpaca not configured), so the evidence gate cannot run." };
    const cache = opts.history ?? new HistoryCache(opts.alpaca, now);
    const currentSpec = resolveSpec(desk.strategy, desk.spec);
    const curParams = effectiveParams(desk.strategy, desk.params);
    const candU = strategyUniverse(desk.strategy, cand.spec);
    const curU = strategyUniverse(desk.strategy, currentSpec);
    const h90 = await cache.get([...new Set([...candU, ...curU])], 90);
    const h30 = await cache.get([...new Set([...candU, ...curU])], 30);
    const bt = (spec: CustomSpec | null, params: StrategyParams, universe: string[], bars: Map<string, Bar[]>) =>
      runBacktest({ strategy: desk.strategy, params, spec, bars, universe, capital: desk.capital_usd });
    const c30 = bt(cand.spec, cand.params, candU, h30);
    const k30 = bt(currentSpec, curParams, curU, h30);
    const c90 = bt(cand.spec, cand.params, candU, h90);
    const k90 = bt(currentSpec, curParams, curU, h90);
    const lite = (r: BacktestResult) => ({ returnPct: r.returnPct, trades: r.trades, expectancy: r.expectancy, maxDrawdownPct: r.maxDrawdownPct, winRate: r.winRate });
    evidence = { kind: "backtest", candidate30: lite(c30), current30: lite(k30), candidate90: lite(c90), current90: lite(k90) };
    const j = judgeBacktest(desk.id, c30, k30, c90, k90);
    if (!j.ok) return { adopted: false, message: `Not adopted — the evidence gate said no: ${j.failures.join("; ")}. (30d: candidate ${c30.returnPct.toFixed(2)}% vs current ${k30.returnPct.toFixed(2)}%; 90d: ${c90.returnPct.toFixed(2)}% vs ${k90.returnPct.toFixed(2)}%)` };
    label = cand.spec ? `strategy "${cand.spec.name}"` : `settings ${JSON.stringify(opts.overrides)}`;
  }

  const before = settingsOf(desk);
  const after = cand.spec ? { spec: cand.spec } : cand.params;

  if (desk.live_enabled) {
    const exp = await startExperiment({
      db,
      log,
      desk: desk.id,
      name: `Proposal: ${label}`.slice(0, 80),
      hypothesis: opts.reason,
      overrides: cand.spec ? {} : Object.fromEntries(Object.entries(cand.params).filter(([k, v]) => effectiveParams(desk.strategy, desk.params)[k] !== v)),
      spec: cand.spec ?? undefined,
      proposedBy: opts.by,
      status: "proposed",
      notes: `Evidence gate passed: ${JSON.stringify(evidence).slice(0, 800)}`,
      now,
    });
    await writeNote(db, { desk: desk.id, author: opts.by, kind: "plan", title: `Proposed to Awad: ${label}`, body: `${desk.name} trades REAL money, so the team does not change it alone. The evidence gate passed; Awad can promote it in the Lab tab. Why: ${opts.reason}`, data: { evidence, experimentId: exp.id } });
    return { adopted: false, proposed: true, experimentId: exp.id, message: `${desk.name} trades real money, so this is a PROPOSAL (test ${exp.id}) for Awad to promote in the Lab tab. Evidence passed.` };
  }

  const version = desk.version + 1;
  const upd = await db
    .from("crypto_floor_desks")
    .update({ ...(cand.spec ? { spec: cand.spec } : { params: cand.params }), version, updated_at: new Date(now).toISOString() })
    .eq("id", desk.id)
    .eq("version", desk.version)
    .select("id");
  if (upd.error) throw new LabError(upd.error.message);
  if (!upd.data?.length) return { adopted: false, message: "The desk changed while this was being checked — look again and retry." };
  await db.from("crypto_floor_param_changes").insert({ desk: desk.id, version, source: "research", reason: `${opts.by}: ${opts.reason}`.slice(0, 1000), before, after: { ...after, evidence } });
  if (opts.experimentId) await db.from("crypto_floor_experiments").update({ status: "promoted", ended_at: new Date(now).toISOString(), notes: `Adopted by ${opts.by} (evidence gate passed)` }).eq("id", opts.experimentId);
  await log.log({
    type: "param_change",
    agentRole: "analyst",
    desk: desk.id,
    strategy: desk.strategy,
    title: `${desk.name} adopted ${label} (v${version}) — ${opts.reason}`.slice(0, 400),
    payload: { before, after, version, source: "research", evidence, by: opts.by },
  });
  await writeNote(db, {
    desk: desk.id,
    author: opts.by,
    kind: "change",
    title: `Adopted ${label} (v${version})`.slice(0, 160),
    body: `${opts.reason}\nNow trading: ${strategySummary(desk.strategy, cand.spec)}\nEvidence: ${JSON.stringify(evidence)}`,
    data: { before, after, evidence, version },
  });
  return { adopted: true, version, message: `Adopted on ${desk.name} paper (v${version}). Evidence: ${JSON.stringify(evidence)}` };
}

// ── REAL MONEY (Coinbase) — OWNER ONLY ───────────────────────────────────────

/** Ceilings on what the owner can set from the UI. Raising these needs a code change. */
export const LIVE_LIMIT_CEILINGS = { maxTotalUsd: 10_000, maxTradeUsd: 2_500, dayLossUsd: 2_500 } as const;
export const LIVE_CONFIRM_PHRASE = "REAL MONEY";

/**
 * OWNER ONLY. Switch a desk's real-money trading on/off. Turning it ON re-checks the Coinbase key right now:
 * it must exist, have Trade, and must NOT have Transfer.
 */
export async function setDeskLive(opts: {
  db: SupabaseClient;
  log: EventLog;
  coinbase: import("./coinbase").CoinbaseClient | null;
  desk: DeskId;
  on: boolean;
  confirm?: string;
  by: string;
}) {
  const { db, log, desk, on, by } = opts;
  if (on) {
    if (opts.confirm !== LIVE_CONFIRM_PHRASE) throw new LabError(`Type ${LIVE_CONFIRM_PHRASE} to switch on real-money trading.`);
    if (!opts.coinbase) throw new LabError("Coinbase is not connected. Add COINBASE_API_KEY_NAME and COINBASE_API_PRIVATE_KEY on Vercel first.");
    let perms;
    try {
      perms = await opts.coinbase.keyPermissions();
    } catch (err) {
      throw new LabError(`Could not reach Coinbase with the saved key: ${err instanceof Error ? err.message.slice(0, 160) : "error"}`);
    }
    if (perms.can_transfer) throw new LabError("This Coinbase key can TRANSFER funds. Create a new key with View + Trade only, then try again.");
    if (!perms.can_trade) throw new LabError("This Coinbase key has no Trade permission.");
  }
  const now = new Date().toISOString();
  const { error } = await db
    .from("crypto_floor_desks")
    .update(on ? { live_enabled: true, live_enabled_at: now, live_enabled_by: by, updated_at: now } : { live_enabled: false, updated_at: now })
    .eq("id", desk);
  if (error) throw new LabError(error.message);
  await db.from("crypto_floor_param_changes").insert({ desk, source: "owner", reason: `Real money ${on ? "ON" : "OFF"} by ${by}`, before: { live_enabled: !on }, after: { live_enabled: on } });
  await log.log({
    type: "live_switch",
    agentRole: "risk",
    desk,
    title: on ? `REAL MONEY ON for ${desk.toUpperCase()} (Coinbase) — switched on by ${by}` : `REAL MONEY OFF for ${desk.toUpperCase()} — no new real-money buys; it still sells coins it holds. Switched off by ${by}`,
    payload: { scope: "live", live: on, by },
  });
}

/** OWNER ONLY. Real-money hard limits. */
export async function setLiveLimits(db: SupabaseClient, log: EventLog, limits: { maxTotalUsd: number; maxTradeUsd: number; dayLossUsd: number }, by: string) {
  const { maxTotalUsd, maxTradeUsd, dayLossUsd } = limits;
  const c = LIVE_LIMIT_CEILINGS;
  if (![maxTotalUsd, maxTradeUsd, dayLossUsd].every((x) => Number.isFinite(x) && x >= 0)) throw new LabError("Limits must be zero or positive numbers.");
  if (maxTotalUsd > c.maxTotalUsd || maxTradeUsd > c.maxTradeUsd || dayLossUsd > c.dayLossUsd) {
    throw new LabError(`Above the built-in ceiling ($${c.maxTotalUsd} total, $${c.maxTradeUsd} per trade, $${c.dayLossUsd} daily loss). Ask Claude to raise the ceiling in code.`);
  }
  if (maxTradeUsd > maxTotalUsd) throw new LabError("Per-trade limit can't be bigger than the total limit.");
  const { data: before } = await db.from("crypto_floor_params").select("live_max_total_usd,live_max_trade_usd,live_day_loss_usd").eq("id", 1).maybeSingle();
  const { error } = await db
    .from("crypto_floor_params")
    .update({ live_max_total_usd: maxTotalUsd, live_max_trade_usd: maxTradeUsd, live_day_loss_usd: dayLossUsd, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new LabError(error.message);
  await db.from("crypto_floor_param_changes").insert({ desk: null, source: "owner", reason: `Real-money limits set by ${by}`, before, after: { live_max_total_usd: maxTotalUsd, live_max_trade_usd: maxTradeUsd, live_day_loss_usd: dayLossUsd } });
  await log.log({ type: "param_change", agentRole: "risk", title: `Real-money limits: $${maxTotalUsd} total · $${maxTradeUsd} per trade · stop after −$${dayLossUsd}/day (set by ${by})`, payload: { scope: "live", by } });
}
