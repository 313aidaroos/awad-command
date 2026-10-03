import { NextResponse } from "next/server";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import { AlpacaClient, floorAlpacaConfig } from "@/lib/crypto-floor/alpaca";
import { runTick } from "@/lib/crypto-floor/tick";
import { cronAuthorized } from "@/lib/crypto-floor/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Crypto Floor robot tick. Vercel Cron calls GET every 5 minutes with `Authorization: Bearer <CRON_SECRET>`.
 * All logic lives in src/lib/crypto-floor/tick.ts (runner) and engine.ts (pure planner).
 */
export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createCryptoFloorDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Crypto Floor database is not configured (SUPABASE_SERVICE_ROLE_KEY)." }, { status: 503 });
  }
  let cfg;
  try {
    cfg = floorAlpacaConfig();
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Alpaca config refused" }, { status: 503 });
  }
  // No CRYPTO_FLOOR_ALPACA_* keys → the tick still runs in "no own account" mode: no broker call, no trading,
  // a heartbeat + event that the UI, health and the daily email show. Never falls back to AwadBot's ALPACA_* keys.
  const result = await runTick({ db, alpaca: cfg ? new AlpacaClient(cfg) : null });
  return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
}
