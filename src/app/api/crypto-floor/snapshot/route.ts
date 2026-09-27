import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";
import { createServerSupabase } from "@/lib/supabase/server";

const ALPACA_PAPER_URL = process.env.ALPACA_PAPER_BASE_URL || "https://paper-api.alpaca.markets";

/**
 * Fetch current Alpaca paper account state and store snapshot
 * Auth: owner only (lead can see Crypto Floor data)
 */
export async function GET() {
  // Auth check BEFORE any processing
  if (!(await isLeadOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  // Verify Alpaca keys configured
  if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_SECRET_KEY) {
    return NextResponse.json(
      {
        error: "Alpaca API keys not configured",
        live: false,
      },
      { status: 503 }
    );
  }

  const headers = {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY,
    "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY,
  };

  try {
    const startTime = Date.now();

    // Parallel fetch: account + positions + orders
    const [accountRes, positionsRes, ordersRes] = await Promise.all([
      fetch(`${ALPACA_PAPER_URL}/v2/account`, { headers }),
      fetch(`${ALPACA_PAPER_URL}/v2/positions`, { headers }),
      fetch(`${ALPACA_PAPER_URL}/v2/orders?status=all&limit=50`, { headers }),
    ]);

    if (!accountRes.ok) {
      throw new Error(`Alpaca account fetch failed: ${accountRes.status} ${accountRes.statusText}`);
    }

    const account = await accountRes.json();
    const positions = positionsRes.ok ? await positionsRes.json() : [];
    const orders = ordersRes.ok ? await ordersRes.json() : [];

    const duration = Date.now() - startTime;

    // Store snapshot in database
    const { data: snapshot, error: dbError } = await supabase
      .from("crypto_floor_snapshot")
      .insert({
        cash: parseFloat(account.cash || "0"),
        portfolio_value: parseFloat(account.portfolio_value || "0"),
        equity: parseFloat(account.equity || "0"),
        positions,
        orders,
        fetched_at: new Date().toISOString(),
        fetch_duration_ms: duration,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Failed to store snapshot:", dbError);
      // Return data anyway, just log DB failure
    }

    // Transform Alpaca data into Crypto Floor Snapshot format
    const floorSnapshot = {
      timestamp: new Date().toISOString(),
      source: "alpaca_paper",
      engine: "ONLINE" as const,
      health: [
        {
          name: "Alpaca Paper API",
          status: "ONLINE" as const,
          detail: `Fetched in ${duration}ms`,
        },
      ],
      teams: [], // TIER 2: will populate with team state
      events: [], // TIER 2: will populate with real events
      markets: [], // TIER 2: will populate with price data
      portfolio: {
        paperBalance: parseFloat(account.cash || "0"),
        liveBalance: null,
        paperPnl: parseFloat(account.equity || "0") - 100000, // Assume $100k starting capital
        livePnl: null,
        openPositions: positions.length,
      },
      killSwitch: {
        halted: false,
        reason: null,
        timestamp: null,
        triggeredBy: null,
      },
      regime: null,
      queueDepth: null,
      openOrders: orders.length,
      latencyMs: duration,
      uptimePct: null,
      lastCycle: new Date().toISOString(),
    };

    return NextResponse.json({
      snapshot: floorSnapshot,
      live: true,
      mode: process.env.TRADE_MODE || "paper",
      rawAlpaca: {
        account,
        positions,
        orders: orders.slice(0, 10), // Last 10 orders only
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    // Log error to database
    try {
      await supabase.from("crypto_floor_snapshot").insert({
        cash: 0,
        portfolio_value: 0,
        equity: 0,
        positions: [],
        orders: [],
        fetched_at: new Date().toISOString(),
        error_log: errorMessage,
      });
    } catch {
      // Ignore DB errors when logging errors
    }

    return NextResponse.json(
      {
        error: errorMessage,
        live: false,
      },
      { status: 500 }
    );
  }
}
