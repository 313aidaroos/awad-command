/**
 * The floor's shared memory: every team's journal (lessons, observations, plans, adopted changes, strategies,
 * meeting minutes) plus the daily floor briefing. Written by meetings, chat and the daily review; read back into
 * every meeting and chat so teams learn from themselves and from each other. Server only (service role).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const NOTE_KINDS = ["lesson", "observation", "plan", "change", "strategy", "briefing", "meeting"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export type NoteRow = {
  id: string;
  created_at: string;
  desk: string | null;
  author: string;
  kind: NoteKind;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  meeting_id: string | null;
};

export type MeetingRow = {
  id: string;
  created_at: string;
  desk: string | null;
  kind: "team" | "allhands";
  status: "running" | "done" | "failed";
  trigger: string | null;
  summary: string | null;
  actions: Array<{ tool: string; ok: boolean; text: string }>;
  ended_at: string | null;
  error: string | null;
};

export async function writeNote(
  db: SupabaseClient,
  n: { desk: string | null; author: string; kind: NoteKind; title: string; body: string; data?: Record<string, unknown> | null; meetingId?: string | null },
): Promise<NoteRow | null> {
  const { data, error } = await db
    .from("crypto_floor_notes")
    .insert({
      desk: n.desk,
      author: n.author.slice(0, 80),
      kind: n.kind,
      title: n.title.trim().slice(0, 160),
      body: n.body.trim().slice(0, 4000),
      data: n.data ?? null,
      meeting_id: n.meetingId ?? null,
    })
    .select("*")
    .single();
  if (error) {
    console.error("writeNote failed:", error.message);
    return null;
  }
  return data as NoteRow;
}

export async function loadNotes(
  db: SupabaseClient,
  opts: { desk?: string | null; notDesk?: string; kinds?: NoteKind[]; since?: string; limit?: number } = {},
): Promise<NoteRow[]> {
  let q = db.from("crypto_floor_notes").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 20);
  if (opts.desk === null) q = q.is("desk", null);
  else if (opts.desk) q = q.eq("desk", opts.desk);
  if (opts.notDesk) q = q.or(`desk.is.null,desk.neq.${opts.notDesk}`);
  if (opts.kinds?.length) q = q.in("kind", opts.kinds);
  if (opts.since) q = q.gte("created_at", opts.since);
  const { data, error } = await q;
  if (error) {
    console.error("loadNotes failed:", error.message);
    return [];
  }
  return (data ?? []) as NoteRow[];
}

export async function loadMeetings(db: SupabaseClient, opts: { desk?: string; since?: string; limit?: number } = {}): Promise<MeetingRow[]> {
  let q = db.from("crypto_floor_meetings").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 10);
  if (opts.desk) q = q.eq("desk", opts.desk);
  if (opts.since) q = q.gte("created_at", opts.since);
  const { data, error } = await q;
  if (error) {
    console.error("loadMeetings failed:", error.message);
    return [];
  }
  return (data ?? []) as MeetingRow[];
}

/** Compact one-liner for prompts and the email. */
export function noteLine(n: Pick<NoteRow, "created_at" | "desk" | "author" | "kind" | "title" | "body">, bodyChars = 400): string {
  const body = n.body.replace(/\s+/g, " ").trim();
  return `${n.created_at.slice(5, 16)} [${(n.desk ?? "floor").toUpperCase()} · ${n.kind} · ${n.author}] ${n.title}${body ? ` — ${body.slice(0, bodyChars)}${body.length > bodyChars ? "…" : ""}` : ""}`;
}
