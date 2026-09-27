import { NextResponse } from "next/server";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";

/**
 * Write immutable event to crypto_floor_events table
 * Server-side only (service role)
 * Used by: order execution, agent decisions, system events
 */
export async function POST(request: Request) {
  // This route is INTERNAL only - called by other server routes, not by client
  // Verify it's a server-side call by checking for internal auth header
  const internalKey = request.headers.get("x-internal-key");
  if (internalKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json(
      { error: "Internal API only" },
      { status: 403 }
    );
  }

  const supabase = createCryptoFloorDb();
  if (!supabase) {
    return NextResponse.json({ error: "Crypto Floor database is not configured (SUPABASE_SERVICE_ROLE_KEY)." }, { status: 503 });
  }
  if (!supabase) {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }

  const event = await request.json();

  // Required fields
  if (!event.event_type || !event.title) {
    return NextResponse.json(
      { error: "Missing required fields: event_type, title" },
      { status: 400 }
    );
  }

  // Write event
  try {
    const { data, error } = await supabase
      .from("crypto_floor_events")
      .insert({
        timestamp: event.timestamp || new Date().toISOString(),
        team_id: event.team_id || null,
        agent_id: event.agent_id || null,
        event_type: event.event_type,
        severity: event.severity || "info",
        title: event.title,
        description: event.description || null,
        symbol: event.symbol || null,
        trade_id: event.trade_id || null,
        order_id: event.order_id || null,
        structured_payload: event.structured_payload || {},
        paper_or_live: event.paper_or_live || "paper",
        correlation_id: event.correlation_id || null,
        source: event.source || "system",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      event: data,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to write event:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
