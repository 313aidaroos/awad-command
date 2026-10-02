/**
 * Daily job: review + bounded learning + email to the owner. Runs from the Vercel cron (/api/crypto-floor/review),
 * or on demand from the floor UI ("Send today's report now").
 * One email per UTC day (crypto_floor_reports.day is the claim); `force` sends again with a fresh idempotency key.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resendRequest } from "@/lib/cixyEmail";
import { floorManagerNote } from "./ai";
import { EventLog } from "./events";
import { writeNote } from "./notes";
import { reportHtml, reportSubject, reportText } from "./report";
import { applyTuning, buildReview, type ReviewSummary } from "./review";

export const DEFAULT_REPORT_EMAIL = "awad@apixis.dev";

export type DailyReportResult = {
  ok: boolean;
  day: string;
  emailed: boolean;
  emailTo: string;
  emailId?: string | null;
  skipped?: string;
  error?: string;
  tuned: string[];
  eventsWritten: number;
  eventErrors: number;
  summary?: ReviewSummary;
};

type Deps = {
  db: SupabaseClient;
  now?: number;
  force?: boolean;
  tune?: boolean;
  to?: string;
  siteUrl?: string;
  send?: (msg: { from: string; to: string; subject: string; text: string; html: string; idempotencyKey: string }) => Promise<{ id: string }>;
  note?: (facts: unknown) => Promise<string | null>;
};

async function resendSend(msg: { from: string; to: string; subject: string; text: string; html: string; idempotencyKey: string }) {
  const result = await resendRequest("/emails", {
    method: "POST",
    headers: { "Idempotency-Key": msg.idempotencyKey },
    body: JSON.stringify({ from: msg.from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
  });
  if (typeof result?.id !== "string") throw new Error("Email provider did not confirm the message id.");
  return { id: result.id as string };
}

export function reportRecipient(env: NodeJS.ProcessEnv = process.env) {
  return env.CRYPTO_FLOOR_REPORT_EMAIL?.trim() || DEFAULT_REPORT_EMAIL;
}

/**
 * OWNER button "Email me this": the current trades + P/L as an email, right now. Read-only: no tuning, no notes,
 * no AI call, does not touch the once-a-day report.
 */
export async function sendFloorUpdate(deps: Pick<Deps, "db" | "now" | "to" | "siteUrl" | "send">): Promise<{ ok: boolean; emailTo: string; emailId?: string; error?: string }> {
  const now = deps.now ?? Date.now();
  const to = deps.to ?? reportRecipient();
  const siteUrl = (deps.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://awad-command.vercel.app").replace(/\/$/, "");
  try {
    const { summary } = await buildReview(deps.db, now, siteUrl);
    const from = process.env.CRYPTO_FLOOR_EMAIL_FROM?.trim() || "AWAD COMMAND Crypto Floor <awad@apixis.dev>";
    const at = new Date(now).toISOString().slice(11, 16);
    const sent = await (deps.send ?? resendSend)({
      from,
      to,
      subject: `Update ${at} UTC · ${reportSubject(summary)}`.slice(0, 240),
      text: reportText(summary),
      html: reportHtml(summary),
      idempotencyKey: `crypto-floor-update-${now}`,
    });
    await new EventLog(deps.db).log({ type: "report", agentRole: "analyst", title: `Floor update emailed to ${to} (owner request)`, payload: { emailId: sent.id, onDemand: true } });
    return { ok: true, emailTo: to, emailId: sent.id };
  } catch (err) {
    return { ok: false, emailTo: to, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runDailyReport(deps: Deps): Promise<DailyReportResult> {
  const now = deps.now ?? Date.now();
  const db = deps.db;
  const log = new EventLog(db);
  const to = deps.to ?? reportRecipient();
  const siteUrl = (deps.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://awad-command.vercel.app").replace(/\/$/, "");
  const day = new Date(now).toISOString().slice(0, 10);
  const base = { day, emailTo: to, tuned: [] as string[] };
  try {
    const { summary, desks } = await buildReview(db, now, siteUrl);
    if (deps.tune !== false) await applyTuning(db, log, summary, desks, now);
    const tuned = summary.desks.filter((d) => d.tuning).map((d) => d.id);

    for (const d of summary.desks) {
      await log.log({
        type: "review",
        agentRole: "analyst",
        desk: d.id,
        strategy: d.strategy,
        title: `${d.name} daily review: 24h ${d.pnl24h === null ? "n/a" : `${d.pnl24h >= 0 ? "+" : "−"}$${Math.abs(d.pnl24h).toFixed(2)}`} · ${d.stats24h.trades} closed · 7d win ${d.stats7d.winRate === null ? "—" : `${Math.round(d.stats7d.winRate * 100)}%`}${d.tuning ? ` · learned: ${d.tuning.reason}` : ""}`,
        payload: { stats24h: d.stats24h, stats7d: d.stats7d, bySymbol24h: d.bySymbol24h, equity: d.equity, pnl24h: d.pnl24h, version: d.version },
      });
    }
    await log.log({
      type: "review",
      agentRole: "analyst",
      title: `Floor daily review ${day}: equity $${summary.floor.equity.toFixed(2)} · ${summary.floor.trades24h} closed trades · robot ${summary.robot.status} ${Math.round(summary.robot.uptimePct)}%`,
      payload: { floor: summary.floor, robot: summary.robot, issues: summary.issues },
    });

    // Daily floor briefing: every team reads it before its next meeting ("updates" for the whole floor).
    const money = (n: number | null) => (n === null ? "n/a" : `${n >= 0 ? "+" : "−"}$${Math.abs(n).toFixed(2)}`);
    await writeNote(db, {
      desk: null,
      author: "FLOOR REVIEW",
      kind: "briefing",
      title: `Daily review ${day}: floor ${money(summary.floor.pnl24h)} · ${summary.floor.trades24h} closed trades`,
      body: [
        ...summary.desks.map((d) => `${d.name} (${d.label}, v${d.version}): 24h ${money(d.pnl24h)}, ${d.stats24h.trades} closed; 7d ${d.stats7d.trades} trades, win ${d.stats7d.winRate === null ? "—" : `${Math.round(d.stats7d.winRate * 100)}%`}, expectancy ${d.stats7d.expectancy === null ? "—" : money(d.stats7d.expectancy)}${d.open.length ? `; open ${d.open.map((p) => `${p.symbol} ${p.pnlPct.toFixed(1)}%`).join(", ")}` : ""}${d.tuning ? `; tuned: ${d.tuning.reason}` : ""}`),
        `Learning: ${summary.learning.meetings24h} meetings, ${summary.learning.adopted.length} adopted change(s)${summary.learning.adopted.length ? ` (${summary.learning.adopted.map((a) => a.desk.toUpperCase()).join(", ")})` : ""}.`,
        summary.issues.length ? `Issues: ${summary.issues.join(" ")}` : "No issues.",
      ].join("\n"),
      data: { floor: summary.floor },
    });

    // Prune old heartbeat telemetry (30 days kept). Trading events are never pruned.
    await db.from("crypto_floor_events").delete().in("type", ["heartbeat", "data_stale"]).lt("ts", new Date(now - 30 * 86_400_000).toISOString());

    const { data: existing } = await db.from("crypto_floor_reports").select("email_status").eq("day", day).maybeSingle();
    if (existing?.email_status === "sent" && !deps.force) {
      return { ok: true, ...base, tuned, emailed: false, skipped: "Today's report was already emailed", eventsWritten: log.written, eventErrors: log.errors, summary };
    }

    summary.aiNote = await (deps.note ?? floorManagerNote)({
      day: summary.day,
      robot: summary.robot,
      floor: summary.floor,
      watching: summary.watching,
      desks: summary.desks.map((d) => ({ name: d.name, strategy: d.label, equity: d.equity, pnl24h: d.pnl24h, trades24h: d.stats24h.trades, winRate7d: d.stats7d.winRate, expectancy7d: d.stats7d.expectancy, open: d.open, learned: d.tuning?.reason ?? null, paused: d.pausedUntil, enabled: d.enabled })),
      trades24h: summary.trades24h.slice(0, 20),
      experiments: summary.experiments,
      learning: summary.learning,
      issues: summary.issues,
    });

    await db.from("crypto_floor_reports").upsert({ day, summary, email_to: to, email_status: "pending", error: null }, { onConflict: "day" });

    const from = process.env.CRYPTO_FLOOR_EMAIL_FROM?.trim() || "AWAD COMMAND Crypto Floor <awad@apixis.dev>";
    try {
      const sent = await (deps.send ?? resendSend)({
        from,
        to,
        subject: reportSubject(summary),
        text: reportText(summary),
        html: reportHtml(summary),
        idempotencyKey: deps.force ? `crypto-floor-${day}-${now}` : `crypto-floor-${day}`,
      });
      await db.from("crypto_floor_reports").update({ email_status: "sent", email_id: sent.id, error: null }).eq("day", day);
      await log.log({ type: "report", agentRole: "analyst", title: `Daily brief emailed to ${to}`, payload: { day, emailId: sent.id } });
      return { ok: true, ...base, tuned, emailed: true, emailId: sent.id, eventsWritten: log.written, eventErrors: log.errors, summary };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.from("crypto_floor_reports").update({ email_status: "failed", error: message.slice(0, 1000) }).eq("day", day);
      await log.log({ type: "system", agentRole: "system", title: `Daily brief email failed: ${message.slice(0, 300)}`, payload: { day, to } });
      return { ok: false, ...base, tuned, emailed: false, error: message, eventsWritten: log.written, eventErrors: log.errors, summary };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await log.log({ type: "system", agentRole: "system", title: `Daily review failed: ${message.slice(0, 300)}` });
    return { ok: false, ...base, emailed: false, error: message, eventsWritten: log.written, eventErrors: log.errors };
  }
}
