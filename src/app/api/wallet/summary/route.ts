import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
import { fetchWalletSummary } from "@/lib/walletStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner only. Proxies the read-only Wallet business summary; the stats key stays on the server. */
export async function GET(request: Request) {
  if (!(await isLeadOwner()))
    return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  const days = Number(new URL(request.url).searchParams.get("days") ?? "30");
  const result = await fetchWalletSummary(Number.isFinite(days) ? days : 30);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
