import { NextResponse } from "next/server";
import { isLeadOwner } from "@/lib/leadOwner";

const ALPACA_PAPER_URL = process.env.ALPACA_PAPER_BASE_URL || "https://paper-api.alpaca.markets";

/**
 * Place manual order on Alpaca paper account
 * Auth: owner only
 * Safety: TRADE_MODE must be paper
 */
export async function POST(request: Request) {
  // Auth BEFORE reading body
  if (!(await isLeadOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify paper mode (refuse live trading)
  const tradeMode = (process.env.TRADE_MODE || "").trim().toLowerCase();
  if (tradeMode !== "paper") {
    return NextResponse.json(
      {
        error: "TRADE_MODE must be paper. Live trading is refused.",
        mode: tradeMode || "unknown",
      },
      { status: 403 }
    );
  }

  // Verify Alpaca keys configured
  if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_SECRET_KEY) {
    return NextResponse.json(
      { error: "Alpaca API keys not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { symbol, side, qty } = body;

  // Validate required fields
  if (!symbol || !side || !qty) {
    return NextResponse.json(
      { error: "Missing required fields: symbol, side, qty" },
      { status: 400 }
    );
  }

  if (!["buy", "sell"].includes(side)) {
    return NextResponse.json(
      { error: "side must be 'buy' or 'sell'" },
      { status: 400 }
    );
  }

  const parsedQty = parseFloat(qty);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return NextResponse.json(
      { error: "qty must be a positive number" },
      { status: 400 }
    );
  }

  // Place order on Alpaca
  try {
    const orderRes = await fetch(`${ALPACA_PAPER_URL}/v2/orders`, {
      method: "POST",
      headers: {
        "APCA-API-KEY-ID": process.env.ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol: symbol.toUpperCase().trim(),
        qty: parsedQty,
        side,
        type: "market",
        time_in_force: "day",
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      throw new Error(`Alpaca order failed: ${orderRes.status} ${errText}`);
    }

    const order = await orderRes.json();

    return NextResponse.json({
      success: true,
      order,
      message: `${side.toUpperCase()} ${parsedQty} ${symbol.toUpperCase()} placed`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
