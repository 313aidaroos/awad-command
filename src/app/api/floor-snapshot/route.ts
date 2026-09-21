import { NextResponse } from "next/server";
import { loadFloor } from "@/crypto-floor/paper/load";

/** Snapshot for the floor. Sample fixtures are not served here. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { status, snapshot } = await loadFloor();
  return NextResponse.json({ status, snapshot });
}
