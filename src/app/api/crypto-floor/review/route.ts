import { NextResponse } from "next/server";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import { cronAuthorized } from "@/lib/crypto-floor/cronAuth";
import { runDailyReport } from "@/lib/crypto-floor/dailyReport";
import { isLeadOwner } from "@/lib/leadOwner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily review + learning + email brief.
 * - Vercel Cron: GET with `Authorization: Bearer <CRON_SECRET>` once a day (vercel.json).
 * - Owner (signed in): POST from the floor UI sends today's brief now (resends if already sent).
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ ok: false, error: "Crypto Floor database is not configured." }, { status: 503 });
  const result = await runDailyReport({ db });
  const { summary, ...rest } = result;
  void summary;
  return NextResponse.json(rest, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const cron = cronAuthorized(request);
  if (!cron && !(await isLeadOwner())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!cron && origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ ok: false, error: "Crypto Floor database is not configured." }, { status: 503 });
  const result = await runDailyReport({ db, force: !cron });
  const { summary, ...rest } = result;
  void summary;
  return NextResponse.json(rest, { status: result.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } });
}
