/**
 * Reports the teams send when they begin (Awad, 2026-10-02):
 *  - opening report at the start of every meeting (journal + live box + email),
 *  - start-of-day report from each team at 00:05 UTC (journal + email).
 * Deterministic: built from the robot's own numbers, no AI call.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendFloorEmail } from "./alerts";
import { deskAgents, deskLead } from "./desks";
import { EventLog } from "./events";
import { writeNote } from "./notes";
import { meetingHoursFor } from "./schedule";
import { loadRobotState, type DeskView, type RobotState } from "./state";
import type { DeskId } from "./types";

const money = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? "n/a" : `${n >= 0 ? "+" : "−"}$${Math.abs(n).toFixed(2)}`);

function deskLines(d: DeskView, state: RobotState): string[] {
  const tests = state.experiments.filter((e) => e.desk === d.id && e.status === "running");
  const since24 = Date.now() - 86_400_000;
  const closed = d.recentTrades.filter((t) => Date.parse(t.exitAt) >= since24);
  return [
    `Trading now: ${d.summary}`,
    `Value $${d.equity.toFixed(2)} (all time ${money(d.equity - d.capital)}, today ${money(d.dayPnl)})${d.pausedUntil ? ` · PAUSED until ${d.pausedUntil}` : ""}${d.enabled ? "" : " · switched OFF"}`,
    d.positions.length ? `Open: ${d.positions.map((p) => `${p.symbol.split("/")[0]} ${p.unrealizedPnlPct >= 0 ? "+" : ""}${p.unrealizedPnlPct.toFixed(2)}% (${money(p.unrealizedPnl)})`).join(", ")}` : "Open: none",
    `Last 24h: ${closed.length} closed trade(s), ${money(closed.reduce((s, t) => s + t.pnl, 0))} · 7 days: ${d.stats7d.trades} trades, win ${d.stats7d.winRate === null ? "—" : `${Math.round(d.stats7d.winRate * 100)}%`}`,
    `Tests running: ${tests.length ? tests.map((e) => `"${e.name}" (${e.trades} trades)`).join(", ") : "none"}`,
  ];
}

/** Opening report at the start of a meeting. Returns the text (also written to the journal and emailed). */
export async function openingReport(db: SupabaseClient, state: RobotState, desk: DeskId | null, meetingId: string): Promise<string> {
  const now = new Date();
  let title: string;
  let lines: string[];
  if (desk) {
    const d = state.desks.find((x) => x.id === desk);
    const team = deskAgents(desk);
    title = `${team[0]?.deskName ?? desk.toUpperCase()} meeting started ${now.toISOString().slice(11, 16)} UTC — opening report`;
    lines = [
      `Present: ${team.map((a) => `${a.name} (${a.role})`).join(", ")}. Chair: ${deskLead(desk).name}.`,
      ...(d ? deskLines(d, state) : []),
      "Agenda: review trades since the last meeting → one hypothesis → backtest 30 and 90 days → shadow test → adopt only if the evidence gate passes → write the lessons.",
    ];
  } else {
    title = `All-hands started ${now.toISOString().slice(11, 16)} UTC — opening report`;
    lines = [
      `Floor value $${state.floor.equity.toFixed(2)} · today ${money(state.floor.dayPnl)} · ${state.floor.openPositions} open position(s).`,
      ...state.desks.map((d) => `${d.name}: value $${d.equity.toFixed(2)} (all time ${money(d.equity - d.capital)}), ${d.positions.length} open, 7d ${d.stats7d.trades} trades.`),
      "Agenda: each lead reports what their team learned → lessons that carry across teams → the floor briefing.",
    ];
  }
  const body = lines.join("\n");
  await writeNote(db, { desk, author: desk ? deskLead(desk).name : "DESK LEADS", kind: "plan", title, body, meetingId });
  await new EventLog(db).log({ type: "meeting", agentRole: "analyst", desk, title: `${title.replace(" — opening report", "")}: ${lines[desk ? 2 : 0]?.slice(0, 160) ?? ""}`, payload: { meetingId, phase: "start", agent: desk ? deskLead(desk).name : null } });
  await sendFloorEmail(db, { subject: title, lines, key: `cf-meeting-start-${meetingId}` });
  return body;
}

/** Start-of-day report from every team (cron 00:05 UTC). */
export async function startOfDayReports(db: SupabaseClient, now = Date.now()) {
  const state = await loadRobotState(db, now);
  const day = new Date(now).toISOString().slice(0, 10);
  const sent: string[] = [];
  for (const d of state.desks) {
    const lead = deskLead(d.id as DeskId);
    const hours = meetingHoursFor(d.id as DeskId).map((h) => `${String(h).padStart(2, "0")}:20`);
    const lines = [
      `${lead.name} for ${d.name}: starting ${day}. We trade 24/7 — the robot runs our strategy every 5 minutes.`,
      ...deskLines(d, state),
      `Meetings today (UTC): ${hours.join(", ")} · all-hands 11:20.`,
    ];
    const title = `${d.name} start-of-day report ${day}`;
    await writeNote(db, { desk: d.id, author: lead.name, kind: "plan", title, body: lines.join("\n") });
    if (await sendFloorEmail(db, { subject: title, lines, key: `cf-sod-${d.id}-${day}` })) sent.push(d.id);
  }
  await new EventLog(db).log({ type: "report", agentRole: "analyst", title: `Start-of-day reports ${day}: ${state.desks.length} teams${sent.length ? ` (emailed: ${sent.join(", ")})` : ""}`, payload: { day, sent } });
  return { ok: true, day, teams: state.desks.length, emailed: sent };
}
