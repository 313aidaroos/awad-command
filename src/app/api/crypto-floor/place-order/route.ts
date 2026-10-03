import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AlpacaClient, AlpacaHttpError, NO_OWN_ACCOUNT_MESSAGE, floorAlpacaConfig, formatQty, mapAlpacaStatus } from "@/lib/crypto-floor/alpaca";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import { EventLog } from "@/lib/crypto-floor/events";
import { normalizePair } from "@/lib/crypto-floor/market";
import { ownerEmail, sameOrigin } from "@/lib/crypto-floor/owner";
import { isResearchOnlySymbol } from "@/crypto-floor/paper/universe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  symbol: z.string().trim().min(3).max(20),
  side: z.enum(["buy", "sell"]),
  qty: z.coerce.number().positive().max(1_000_000),
});

/**
 * OWNER ONLY: manual crypto market order on the Alpaca PAPER account.
 * Recorded in crypto_floor_orders as book "manual" (never mixed into a desk's ledger) and in the event log.
 * Crypto orders must be time_in_force "gtc" — "day" is rejected by Alpaca ("invalid crypto time_in_force").
 */
export async function POST(request: Request) {
  const by = await ownerEmail();
  if (!by) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if ((process.env.TRADE_MODE || "").trim().toLowerCase() !== "paper") {
    return NextResponse.json({ error: "TRADE_MODE must be paper. Live trading is refused." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a coin (e.g. BTC/USD), buy or sell, and a positive quantity." }, { status: 400 });
  const symbol = normalizePair(parsed.data.symbol);
  if (!/^[A-Z0-9]{2,10}\/USD$/.test(symbol)) return NextResponse.json({ error: "Crypto pairs only, like BTC/USD." }, { status: 400 });
  if (isResearchOnlySymbol(symbol)) return NextResponse.json({ error: `${symbol} is not on Alpaca. Research notes only.` }, { status: 400 });

  let cfg;
  try {
    cfg = floorAlpacaConfig();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Alpaca config refused" }, { status: 503 });
  }
  if (!cfg) return NextResponse.json({ error: NO_OWN_ACCOUNT_MESSAGE }, { status: 503 });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ error: "Crypto Floor database is not configured." }, { status: 503 });
  const alpaca = new AlpacaClient(cfg);
  const log = new EventLog(db);
  const { side } = parsed.data;
  const qty = formatQty(parsed.data.qty);
  const clientOrderId = `cf-manual-${symbol.replace("/", "")}-${side}-${randomUUID().slice(0, 8)}`;

  const claim = await db.from("crypto_floor_orders").insert({
    client_order_id: clientOrderId,
    book: "manual",
    desk: null,
    strategy: "manual",
    mode: "paper",
    symbol,
    side,
    intent: "manual",
    qty: Number(qty),
    status: "pending_submit",
    reason: `Manual order by ${by}`,
  });
  if (claim.error) return NextResponse.json({ error: `Could not record the order: ${claim.error.message}` }, { status: 500 });

  try {
    const order = await alpaca.submitOrder({ symbol, qty, side, clientOrderId });
    await db
      .from("crypto_floor_orders")
      .update({
        status: mapAlpacaStatus(order.status),
        alpaca_order_id: order.id,
        filled_qty: Number(order.filled_qty || 0),
        filled_avg_price: order.filled_avg_price ? Number(order.filled_avg_price) : null,
        filled_at: order.filled_at,
        updated_at: new Date().toISOString(),
      })
      .eq("client_order_id", clientOrderId);
    await log.log({
      type: "order_submitted",
      agentRole: "trader",
      strategy: "manual",
      symbol,
      side,
      qty: Number(qty),
      orderId: clientOrderId,
      title: `MANUAL ${side.toUpperCase()} ${qty} ${symbol} by Awad`,
      payload: { alpaca_order_id: order.id, manual: true },
    });
    return NextResponse.json({ success: true, order, clientOrderId, message: `${side.toUpperCase()} ${qty} ${symbol} sent to Alpaca paper (${order.status}).` });
  } catch (err) {
    const definitive = err instanceof AlpacaHttpError && err.status < 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    await db
      .from("crypto_floor_orders")
      .update({ status: definitive ? "rejected" : "unknown", error: message.slice(0, 1000), updated_at: new Date().toISOString() })
      .eq("client_order_id", clientOrderId);
    await log.log({ type: definitive ? "order_rejected" : "system", agentRole: definitive ? "trader" : "system", strategy: "manual", symbol, side, orderId: clientOrderId, title: `MANUAL ${side.toUpperCase()} ${qty} ${symbol} ${definitive ? "rejected" : "state unknown"}: ${message.slice(0, 200)}` });
    return NextResponse.json({ error: definitive ? `Alpaca rejected the order: ${message}` : `Order state unknown (${message}). The robot reconciles it on the next tick — do not resend yet.` }, { status: definitive ? 400 : 502 });
  }
}
