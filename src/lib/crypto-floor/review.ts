/**
 * Daily review ("learning v1", ROBOT-SPEC Step 5) + daily brief email.
 *
 * Once a day: per desk and per coin — trades, win rate, avg win/loss, expectancy, drawdown, 24h P&L.
 * Bounded, deterministic tuning (no LLM decides anything):
 *  - momentum-v1: 7d expectancy < 0 → entry threshold +0.5% (max 4%); 7d win rate > 60% and expectancy > 0 → −0.25% (min 1.5%).
 *  - dip-v1: 7d expectancy < 0 → dip threshold 1% deeper (max −8%); win rate > 60% and expectancy > 0 → 0.5% shallower (min −2.5%).
 *  A desk is tuned at most once per 20h and only with ≥ MIN_TRADES_TO_TUNE closed trades in 7 days.
 * Each change: desk version+1, a crypto_floor_param_changes row, a param_change event.
 * Claude may write a 4–6 sentence note for the email from the computed numbers only; it never changes anything.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { DESK_STRATEGY } from "./desks";
import { EventLog } from "./events";
import { buildBooks, emptyBook, markBook, tradeStats, type ClosedTrade, type TradeStats } from "./ledger";
import { loadMeetings, loadNotes } from "./notes";
import { loadDesks, loadExperiments, loadFilledOrders, loadParams } from "./store";
import { STRATEGIES, effectiveParams, resolveSpec } from "./strategies";
import type { DeskRow, StrategyId, StrategyParams, WatchStat } from "./types";

export const MIN_TRADES_TO_TUNE = 3;
const DAY_MS = 86_400_000;

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Spec Step 5 tuning. Returns the new params + reason, or null when nothing changes. Pure. */
export function tuneParams(
  strategy: StrategyId,
  params: StrategyParams,
  stats7d: Pick<TradeStats, "trades" | "winRate" | "expectancy">,
  minTrades = MIN_TRADES_TO_TUNE,
): { params: StrategyParams; reason: string } | null {
  if (stats7d.trades < minTrades || stats7d.expectancy === null) return null;
  const exp = stats7d.expectancy;
  const wr = stats7d.winRate ?? 0;
  const next = { ...params };
  const bounds = STRATEGIES[strategy].bounds;
  if (strategy === "momentum-v1") {
    const cur = Number(params.entryThresholdPct);
    let v = cur;
    if (exp < 0) v = Math.min(4, cur + 0.5);
    else if (wr > 0.6 && exp > 0) v = Math.max(1.5, cur - 0.25);
    v = Math.min(bounds.entryThresholdPct.max, Math.max(bounds.entryThresholdPct.min, round2(v)));
    if (v === cur) return null;
    next.entryThresholdPct = v;
    return {
      params: next,
      reason: exp < 0
        ? `7d expectancy $${exp.toFixed(2)} < 0 over ${stats7d.trades} trades → entry threshold ${cur}% → ${v}% (more selective)`
        : `7d win rate ${(wr * 100).toFixed(0)}% > 60% with positive expectancy → entry threshold ${cur}% → ${v}%`,
    };
  }
  if (strategy === "dip-v1") {
    const cur = Number(params.dipThresholdPct);
    let v = cur;
    if (exp < 0) v = Math.max(-8, cur - 1);
    else if (wr > 0.6 && exp > 0) v = Math.min(-2.5, cur + 0.5);
    v = Math.min(bounds.dipThresholdPct.max, Math.max(bounds.dipThresholdPct.min, round2(v)));
    if (v === cur) return null;
    next.dipThresholdPct = v;
    return {
      params: next,
      reason: exp < 0
        ? `7d expectancy $${exp.toFixed(2)} < 0 over ${stats7d.trades} trades → wait for a deeper dip: ${cur}% → ${v}%`
        : `7d win rate ${(wr * 100).toFixed(0)}% > 60% with positive expectancy → buy shallower dips: ${cur}% → ${v}%`,
    };
  }
  return null; // swing-v1 / breakout-v1: tested through experiments, no auto-tuning in v1
}

export type DeskReview = {
  id: string;
  name: string;
  strategy: StrategyId;
  label: string;
  enabled: boolean;
  pausedUntil: string | null;
  version: number;
  capital: number;
  equity: number;
  pnl24h: number | null;
  pnl24hPct: number | null;
  realizedAllTime: number;
  stats24h: TradeStats;
  stats7d: TradeStats;
  bySymbol24h: Record<string, { trades: number; pnl: number }>;
  open: Array<{ symbol: string; qty: number; entry: number; price: number; pnlPct: number; pnl: number }>;
  tuning: { reason: string; before: StrategyParams; after: StrategyParams } | null;
};

export type ExperimentReview = {
  id: string;
  name: string;
  desk: string;
  strategy: StrategyId;
  status: string;
  startedAt: string | null;
  endsAt: string | null;
  trades: number;
  winRate: number | null;
  returnPct: number;
  deskReturnPct: number | null;
  recommendation: string;
};

export type ReviewSummary = {
  day: string;
  generatedAt: string;
  siteUrl: string;
  robot: { status: "RUNNING" | "STALE" | "HALTED" | "NO DATA"; lastTickAt: string | null; ticks24h: number; uptimePct: number; staleTicks: number; dedicatedAccount: boolean | null };
  killSwitch: { halted: boolean; reason: string | null };
  watching: WatchStat[];
  floor: { capital: number; equity: number; pnl24h: number | null; pnl24hPct: number | null; openPositions: number; trades24h: number; winRate24h: number | null; realized24h: number };
  desks: DeskReview[];
  trades24h: Array<ClosedTrade & { desk: string }>;
  experiments: ExperimentReview[];
  /** REAL MONEY (Coinbase). OFF unless the owner switched a desk on. */
  realMoney: { connected: boolean; ok: boolean; totalUsd: number | null; enabledDesks: string[]; pnl: number; trades24h: number; limits: { maxTotalUsd: number; maxTradeUsd: number; dayLossUsd: number }; note: string | null };
  /** What the teams learned in 24h: meetings held, changes adopted, journal lessons. */
  learning: {
    meetings24h: number;
    failedMeetings24h: number;
    adopted: Array<{ desk: string; reason: string }>;
    notes: Array<{ desk: string | null; author: string; kind: string; title: string; body: string }>;
  };
  issues: string[];
  aiNote: string | null;
};

type HeartbeatPayload = {
  coinbase?: { configured?: boolean; ok?: boolean; error?: string | null; totalUsd?: number; canTransfer?: boolean; blocked?: string | null } | null;
  prices?: Record<string, number>;
  watching?: WatchStat[];
  desks?: Array<{ id: string; equity: number }>;
  floor?: { equity: number };
  dataStale?: boolean;
  dedicatedAccount?: boolean;
};

async function heartbeatNear(db: SupabaseClient, iso: string, before = true) {
  const q = db.from("crypto_floor_events").select("ts,payload").eq("type", "heartbeat");
  const { data } = before
    ? await q.lte("ts", iso).order("ts", { ascending: false }).limit(1)
    : await q.gte("ts", iso).order("ts", { ascending: true }).limit(1);
  const row = data?.[0];
  return row ? { ts: String(row.ts), payload: (row.payload ?? {}) as HeartbeatPayload } : null;
}

export async function buildReview(db: SupabaseClient, now: number, siteUrl: string): Promise<{ summary: ReviewSummary; desks: DeskRow[] }> {
  const since24 = now - DAY_MS;
  const since7d = now - 7 * DAY_MS;
  const [params, desks, experiments, filled, latest, dayAgo, ticks, events, notes24, meetings24, adopted24] = await Promise.all([
    loadParams(db),
    loadDesks(db),
    loadExperiments(db),
    loadFilledOrders(db),
    heartbeatNear(db, new Date(now).toISOString()),
    heartbeatNear(db, new Date(since24).toISOString(), false),
    db.from("crypto_floor_events").select("payload", { count: "exact" }).eq("type", "heartbeat").gte("ts", new Date(since24).toISOString()).limit(400),
    db.from("crypto_floor_events").select("ts,type,desk,symbol,payload").in("type", ["halt", "system", "order_rejected", "data_stale", "kill_switch", "kill_reset"]).gte("ts", new Date(since24).toISOString()).order("ts", { ascending: false }).limit(300),
    loadNotes(db, { since: new Date(since24).toISOString(), kinds: ["lesson", "change", "strategy", "plan"], limit: 40 }),
    loadMeetings(db, { since: new Date(since24).toISOString(), limit: 60 }),
    db.from("crypto_floor_param_changes").select("desk,reason").eq("source", "research").gte("created_at", new Date(since24).toISOString()).order("created_at", { ascending: false }).limit(20),
  ]);
  const prices = new Map(Object.entries(latest?.payload.prices ?? {}).map(([k, v]) => [k, Number(v)]));
  const books = buildBooks(filled);
  const oldEquity = new Map((dayAgo?.payload.desks ?? []).map((d) => [d.id, Number(d.equity)]));

  const deskReviews: DeskReview[] = desks.map((d) => {
    const strategy = d.strategy;
    const marked = markBook(books.get(d.id) ?? emptyBook(d.id), d.capital_usd, prices);
    const trades = marked.closedTrades;
    const s24 = tradeStats(trades, since24);
    const s7 = tradeStats(trades, since7d);
    const bySymbol: DeskReview["bySymbol24h"] = {};
    for (const t of trades.filter((x) => Date.parse(x.exitAt) >= since24)) {
      const e = (bySymbol[t.symbol] ??= { trades: 0, pnl: 0 });
      e.trades++;
      e.pnl += t.pnl;
    }
    const prev = oldEquity.get(d.id);
    return {
      id: d.id,
      name: d.name,
      strategy,
      label: strategy === "custom-v1" ? `Own strategy: "${resolveSpec(strategy, d.spec)?.name ?? "—"}"` : STRATEGIES[strategy].label,
      enabled: d.enabled,
      pausedUntil: d.paused_until,
      version: d.version,
      capital: d.capital_usd,
      equity: marked.equity,
      pnl24h: prev !== undefined ? marked.equity - prev : null,
      pnl24hPct: prev ? ((marked.equity - prev) / prev) * 100 : null,
      realizedAllTime: marked.realizedPnl,
      stats24h: s24,
      stats7d: s7,
      bySymbol24h: bySymbol,
      open: marked.positions.map((p) => ({ symbol: p.symbol, qty: p.qty, entry: p.avgEntryPrice, price: p.currentPrice, pnlPct: p.unrealizedPnlPct, pnl: p.unrealizedPnl })),
      tuning: null,
    };
  });

  const expReviews: ExperimentReview[] = experiments
    .filter((e) => e.status === "running" || (e.ended_at && Date.parse(e.ended_at) >= since24) || e.status === "proposed")
    .map((e) => {
      const marked = markBook(books.get(`exp:${e.id}`) ?? emptyBook(`exp:${e.id}`), e.capital_usd, prices);
      const start = e.started_at ? Date.parse(e.started_at) : Date.parse(e.created_at);
      const st = tradeStats(marked.closedTrades);
      const returnPct = ((marked.equity - e.capital_usd) / e.capital_usd) * 100;
      const desk = deskReviews.find((d) => d.id === e.desk);
      const deskTrades = desk ? tradeStats((books.get(e.desk) ?? emptyBook(e.desk)).closedTrades, start) : null;
      const deskReturnPct = desk && deskTrades ? (deskTrades.realized / desk.capital) * 100 : null;
      const recommendation =
        st.trades < 5
          ? `Needs more trades (${st.trades}/5) before a verdict`
          : deskReturnPct !== null && returnPct > deskReturnPct && (st.expectancy ?? 0) > 0
            ? "Beating the live desk — candidate to promote (owner approval in the Lab tab)"
            : "Not beating the live desk yet";
      return { id: e.id, name: e.name, desk: e.desk, strategy: e.strategy, status: e.status, startedAt: e.started_at, endsAt: e.ends_at, trades: st.trades, winRate: st.winRate, returnPct, deskReturnPct, recommendation };
    });

  const tickCount = ticks.count ?? (ticks.data ?? []).length;
  const staleTicks = (ticks.data ?? []).filter((r) => (r.payload as HeartbeatPayload)?.dataStale).length;
  const lastTickAt = latest?.ts ?? null;
  const fresh = lastTickAt !== null && now - Date.parse(lastTickAt) < 15 * 60_000;
  const evs = events.data ?? [];
  const issues: string[] = [];
  const count = (t: string) => evs.filter((e) => e.type === t).length;
  if (!fresh) issues.push(lastTickAt ? `Robot has not ticked since ${lastTickAt} — check the Vercel cron.` : "No robot heartbeat recorded yet.");
  if (count("halt")) issues.push(`${count("halt")} day-loss pause(s) in the last 24h.`);
  if (count("order_rejected")) issues.push(`${count("order_rejected")} order(s) rejected by Alpaca.`);
  if (count("system")) issues.push(`${count("system")} system error(s): ${String((evs.find((e) => e.type === "system")?.payload as Record<string, unknown>)?.title ?? "").slice(0, 160)}`);
  if (staleTicks) issues.push(`Market data was stale on ${staleTicks} tick(s); entries were blocked then.`);
  if (latest?.payload.dedicatedAccount === false) issues.push("The floor still trades the Alpaca paper account it shares with AwadBot. Add CRYPTO_FLOOR_ALPACA_API_KEY / CRYPTO_FLOOR_ALPACA_SECRET_KEY (a separate paper account) to isolate it.");

  const cbp = latest?.payload.coinbase ?? null;
  const liveBooks = desks.map((d) => markBook(books.get(`live:${d.id}`) ?? emptyBook(`live:${d.id}`), 0, prices));
  const enabledLive = desks.filter((d) => d.live_enabled).map((d) => d.id);
  if (cbp?.canTransfer) issues.push("Your Coinbase key can TRANSFER funds — the robot refuses to trade with it. Create a View + Trade key.");
  if (enabledLive.length && cbp?.blocked) issues.push(`Real-money trading is blocked: ${cbp.blocked}`);
  const realMoney: ReviewSummary["realMoney"] = {
    connected: cbp?.configured === true,
    ok: cbp?.ok === true,
    totalUsd: cbp?.ok ? Number(cbp.totalUsd ?? 0) : null,
    enabledDesks: enabledLive,
    pnl: liveBooks.reduce((sum, b) => sum + b.realizedPnl + b.unrealizedPnl, 0),
    trades24h: liveBooks.reduce((sum, b) => sum + b.closedTrades.filter((t) => Date.parse(t.exitAt) >= since24).length, 0),
    limits: { maxTotalUsd: params.live_max_total_usd, maxTradeUsd: params.live_max_trade_usd, dayLossUsd: params.live_day_loss_usd },
    note: !cbp?.configured ? "Coinbase not connected" : cbp.ok ? null : `Coinbase error: ${cbp.error ?? "unknown"}`,
  };

  const failedMeetings = meetings24.filter((m) => m.status === "failed");
  if (failedMeetings.length) issues.push(`${failedMeetings.length} team meeting(s) failed: ${failedMeetings[0].error?.slice(0, 160) ?? "unknown error"}`);
  const learning: ReviewSummary["learning"] = {
    meetings24h: meetings24.filter((m) => m.status === "done").length,
    failedMeetings24h: failedMeetings.length,
    adopted: (adopted24.data ?? []).map((r) => ({ desk: String(r.desk ?? ""), reason: String(r.reason ?? "") })),
    notes: notes24.filter((n) => n.kind !== "change").slice(0, 15).map((n) => ({ desk: n.desk, author: n.author, kind: n.kind, title: n.title, body: n.body.slice(0, 400) })),
  };

  const trades24h = deskReviews.flatMap((d) => (books.get(d.id)?.closedTrades ?? []).filter((t) => Date.parse(t.exitAt) >= since24).map((t) => ({ ...t, desk: d.id })));
  const allStats24 = tradeStats(trades24h);
  const capital = deskReviews.reduce((s, d) => s + d.capital, 0);
  const equity = deskReviews.reduce((s, d) => s + d.equity, 0);
  const prevFloor = dayAgo?.payload.floor?.equity;

  const summary: ReviewSummary = {
    day: new Date(now).toISOString().slice(0, 10),
    generatedAt: new Date(now).toISOString(),
    siteUrl,
    robot: {
      status: params.halted ? "HALTED" : !lastTickAt ? "NO DATA" : fresh ? "RUNNING" : "STALE",
      lastTickAt,
      ticks24h: tickCount,
      uptimePct: Math.min(100, (tickCount / 288) * 100),
      staleTicks,
      dedicatedAccount: latest?.payload.dedicatedAccount ?? null,
    },
    killSwitch: { halted: params.halted, reason: params.halt_reason },
    watching: latest?.payload.watching ?? [],
    floor: {
      capital,
      equity,
      pnl24h: prevFloor !== undefined ? equity - Number(prevFloor) : null,
      pnl24hPct: prevFloor ? ((equity - Number(prevFloor)) / Number(prevFloor)) * 100 : null,
      openPositions: deskReviews.reduce((s, d) => s + d.open.length, 0),
      trades24h: allStats24.trades,
      winRate24h: allStats24.winRate,
      realized24h: allStats24.realized,
    },
    desks: deskReviews,
    trades24h: trades24h.sort((a, b) => b.exitAt.localeCompare(a.exitAt)),
    experiments: expReviews,
    realMoney,
    learning,
    issues,
    aiNote: null,
  };
  return { summary, desks };
}

/** Apply bounded tuning to each desk (at most once per 20h per desk). Mutates summary.desks[].tuning. */
export async function applyTuning(db: SupabaseClient, log: EventLog, summary: ReviewSummary, desks: DeskRow[], now: number) {
  const { data: recent } = await db
    .from("crypto_floor_param_changes")
    .select("desk")
    .eq("source", "review")
    .gte("created_at", new Date(now - 20 * 3_600_000).toISOString());
  const tunedRecently = new Set((recent ?? []).map((r) => r.desk));
  for (const d of summary.desks) {
    if (tunedRecently.has(d.id)) continue;
    const row = desks.find((x) => x.id === d.id);
    if (!row) continue;
    const before = effectiveParams(row.strategy, row.params);
    const t = tuneParams(row.strategy, before, d.stats7d);
    if (!t) continue;
    const version = row.version + 1;
    const { error } = await db
      .from("crypto_floor_desks")
      .update({ params: t.params, version, updated_at: new Date(now).toISOString() })
      .eq("id", d.id)
      .eq("version", row.version);
    if (error) {
      await log.log({ type: "system", agentRole: "system", desk: d.id, title: `Review could not save tuning for ${d.id}: ${error.message}` });
      continue;
    }
    await db.from("crypto_floor_param_changes").insert({ desk: d.id, version, source: "review", reason: t.reason, before, after: t.params });
    await log.log({ type: "param_change", agentRole: "analyst", desk: d.id, strategy: row.strategy, title: `${d.name} learned: ${t.reason} (v${version})`, payload: { before, after: t.params, version, source: "review" } });
    d.tuning = { reason: t.reason, before, after: t.params };
    d.version = version;
  }
}

export function deskStrategyFor(desk: string): StrategyId | null {
  return (DESK_STRATEGY as Record<string, StrategyId>)[desk] ?? null;
}
