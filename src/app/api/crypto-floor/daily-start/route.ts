import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/crypto-floor/cronAuth";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import { startOfDayReports } from "@/lib/crypto-floor/teamReports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Vercel Cron 00:05 UTC: every team sends its start-of-day report (journal + email). */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ ok: false, error: "Crypto Floor database is not configured." }, { status: 503 });
  try {
    return NextResponse.json(await startOfDayReports(db), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
