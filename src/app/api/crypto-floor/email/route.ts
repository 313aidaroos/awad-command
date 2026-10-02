import { NextResponse } from "next/server";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import { sendFloorUpdate } from "@/lib/crypto-floor/dailyReport";
import { ownerEmail, sameOrigin } from "@/lib/crypto-floor/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** OWNER: email the floor's current trades + P/L to the report address now ("Email me this" button). */
export async function POST(request: Request) {
  if (!(await ownerEmail())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ error: "Crypto Floor database is not configured." }, { status: 503 });
  const r = await sendFloorUpdate({ db });
  return NextResponse.json(r, { status: r.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } });
}
