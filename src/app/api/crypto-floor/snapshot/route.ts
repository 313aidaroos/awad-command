import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import { loadRobotState, toFloorSnapshot } from "@/lib/crypto-floor/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Crypto Floor state for the owner's UI. Database only — the 5-minute robot tick is the single Alpaca reader,
 * so the page can poll without spending Alpaca calls or growing the snapshot table.
 * Returns the floor-art Snapshot (model.ts schema) plus the full robot state.
 */
export async function GET() {
  if (!(await isLeadOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createCryptoFloorDb();
  if (!db) {
    return NextResponse.json({ live: false, error: "Crypto Floor database is not configured (SUPABASE_SERVICE_ROLE_KEY)." }, { status: 503 });
  }
  try {
    const robot = await loadRobotState(db);
    return NextResponse.json(
      { live: true, mode: process.env.TRADE_MODE || "paper", snapshot: toFloorSnapshot(robot), robot },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("crypto-floor snapshot failed:", message);
    return NextResponse.json({ live: false, error: message }, { status: 500 });
  }
}
