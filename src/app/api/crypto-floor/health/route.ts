import { NextResponse } from "next/server";

const ALPACA_PAPER_URL = process.env.ALPACA_PAPER_BASE_URL || "https://paper-api.alpaca.markets";

/**
 * Health check: verify Alpaca paper API is reachable
 * Public endpoint (no auth) for monitoring
 */
export async function GET() {
  // Verify required env vars exist
  if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_SECRET_KEY) {
    return NextResponse.json(
      { 
        healthy: false, 
        error: "Alpaca API keys not configured",
        mode: null,
      },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${ALPACA_PAPER_URL}/v2/account`, {
      headers: {
        "APCA-API-KEY-ID": process.env.ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY,
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) {
      return NextResponse.json(
        { 
          healthy: false, 
          error: `Alpaca returned HTTP ${res.status}`,
          mode: process.env.TRADE_MODE || "unknown",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ 
      healthy: true, 
      mode: process.env.TRADE_MODE || "paper",
      url: ALPACA_PAPER_URL,
    });

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { healthy: false, error, mode: null },
      { status: 503 }
    );
  }
}
