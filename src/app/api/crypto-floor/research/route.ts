import { NextResponse } from "next/server";
import { z } from "zod";
import { AlpacaClient, floorAlpacaConfig } from "@/lib/crypto-floor/alpaca";
import { cronAuthorized } from "@/lib/crypto-floor/cronAuth";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import { ownerEmail, sameOrigin } from "@/lib/crypto-floor/owner";
import { runMeeting, scheduledMeeting, type MeetingPlan } from "@/lib/crypto-floor/research";
import { DESK_IDS, type DeskId } from "@/lib/crypto-floor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function alpacaOrNull(): AlpacaClient | null {
  try {
    const cfg = floorAlpacaConfig();
    return cfg ? new AlpacaClient(cfg) : null;
  } catch {
    return null;
  }
}

/**
 * Team meetings (learning loop, src/lib/crypto-floor/research.ts).
 * - Vercel Cron: GET hourly at :20 with `Authorization: Bearer <CRON_SECRET>` — the team on the rotation meets
 *   (RONIN every other hour, each core team three times a day; 11:20 UTC is the all-hands of the five leads).
 * - Owner (signed in): POST {desk} or {desk:"allhands"} runs a meeting now.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ ok: false, error: "Crypto Floor database is not configured." }, { status: 503 });
  const result = await runMeeting({ db, alpaca: alpacaOrNull(), plan: scheduledMeeting(Date.now()), trigger: "cron" });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

const schema = z.object({ desk: z.enum([...(DESK_IDS as [DeskId, ...DeskId[]]), "allhands"]) });

export async function POST(request: Request) {
  const by = await ownerEmail();
  if (!by) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ error: "Crypto Floor database is not configured." }, { status: 503 });
  const plan: MeetingPlan = parsed.data.desk === "allhands" ? { kind: "allhands" } : { kind: "team", desk: parsed.data.desk };
  const result = await runMeeting({ db, alpaca: alpacaOrNull(), plan, trigger: `owner ${by}` });
  return NextResponse.json(result, { status: result.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } });
}
