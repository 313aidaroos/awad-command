import { NextResponse } from "next/server";
import { AlpacaClient, NO_OWN_ACCOUNT_MESSAGE, floorAlpacaConfig, missingFloorKeys } from "@/lib/crypto-floor/alpaca";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check for the Crypto Floor's OWN Alpaca paper account (CRYPTO_FLOOR_ALPACA_*). Public (no auth), no secrets.
 * 2026-10-02: never reads AwadBot's ALPACA_API_KEY / ALPACA_SECRET_KEY. Missing keys → { noOwnAccount: true }.
 */
export async function GET() {
  const mode = (process.env.TRADE_MODE || "").trim().toLowerCase() || null;
  let cfg;
  try {
    cfg = floorAlpacaConfig();
  } catch (err) {
    return NextResponse.json({ healthy: false, noOwnAccount: false, error: err instanceof Error ? err.message : "Alpaca config refused", mode }, { status: 503 });
  }
  if (!cfg) {
    return NextResponse.json({ healthy: false, noOwnAccount: true, missing: missingFloorKeys(), error: NO_OWN_ACCOUNT_MESSAGE, mode }, { status: 503 });
  }
  try {
    const account = await new AlpacaClient(cfg, fetch, 5000).account();
    return NextResponse.json({ healthy: true, noOwnAccount: false, mode: mode ?? "unknown", url: cfg.tradeBase, accountStatus: account.status ?? null });
  } catch (err) {
    return NextResponse.json({ healthy: false, noOwnAccount: false, error: err instanceof Error ? err.message.slice(0, 200) : "Unknown error", mode }, { status: 503 });
  }
}
