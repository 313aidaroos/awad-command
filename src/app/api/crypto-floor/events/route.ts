import { NextResponse } from "next/server";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import { ownerEmail } from "@/lib/crypto-floor/owner";
import { toEventView } from "@/lib/crypto-floor/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OWNER: read the robot's event log. Filters: desk, type, before (ISO), limit (≤ 500).
 * Writes happen only server-side inside the robot (src/lib/crypto-floor/events.ts); there is no write endpoint.
 */
export async function GET(request: Request) {
  if (!(await ownerEmail())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ error: "Crypto Floor database is not configured." }, { status: 503 });
  const q = new URL(request.url).searchParams;
  const limit = Math.max(1, Math.min(500, Number(q.get("limit") ?? 100) || 100));
  let query = db.from("crypto_floor_events").select("*").order("ts", { ascending: false }).limit(limit);
  const desk = q.get("desk");
  const type = q.get("type");
  const before = q.get("before");
  if (desk) query = query.eq("desk", desk);
  if (type) query = query.eq("type", type);
  else query = query.neq("type", "heartbeat");
  if (before && Number.isFinite(Date.parse(before))) query = query.lt("ts", new Date(before).toISOString());
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: (data ?? []).map(toEventView) }, { headers: { "Cache-Control": "no-store" } });
}
