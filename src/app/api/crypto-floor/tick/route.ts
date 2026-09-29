import { NextResponse } from "next/server";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import {
  runStrategy,
  type MomentumConfig,
  type Bar,
  type Position,
  type RecentEntry,
} from "@/lib/crypto-floor/strategy/momentum-v1";


// Wire shapes from Alpaca / Supabase, typed narrowly so lint passes and mistakes surface at compile time.
type AlpacaPositionWire = { symbol: string; qty: string; avg_entry_price: string; current_price: string; unrealized_pl: string; unrealized_plpc: string };
type AlpacaBarWire = { t: string; o: number; h: number; l: number; c: number; v: number };
type RecentEventWire = { symbol: string; ts: string };

const ALPACA_PAPER_URL =
  process.env.ALPACA_PAPER_BASE_URL || "https://paper-api.alpaca.markets";
const ALPACA_DATA_URL = "https://data.alpaca.markets";

/**
 * Crypto Floor Robot Tick
 * Runs every 5 minutes via cron
 * Auth: CRON_SECRET bearer token only
 */
export async function POST(request: Request) {
  // Auth: CRON_SECRET only
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createCryptoFloorDb();
  if (!supabase) {
    return NextResponse.json({ error: "Crypto Floor database is not configured (SUPABASE_SERVICE_ROLE_KEY)." }, { status: 503 });
  }
  if (!supabase) {
    await logEvent("system", "error", "Database unavailable", {});
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  try {
    // Step 1: Assert paper mode
    const tradeMode = (process.env.TRADE_MODE || "").trim().toLowerCase();
    if (tradeMode !== "paper") {
      await logEvent("system", "error", "TRADE_MODE must be paper", { mode: tradeMode });
      return NextResponse.json({ error: "TRADE_MODE must be paper" }, { status: 403 });
    }

    // Step 2: Read params
    const { data: params } = await supabase
      .from("crypto_floor_params")
      .select("*")
      .eq("id", 1)
      .single();

    if (!params) {
      await logEvent("system", "error", "Params not found", {});
      return NextResponse.json({ error: "Params not found" }, { status: 500 });
    }

    if (params.halted) {
      await logEvent("system", "info", "Robot halted", { version: params.version });
      return NextResponse.json({ halted: true, reason: "Robot halted by params" });
    }

    const config: MomentumConfig = {
      universe: ["BTC/USD", "ETH/USD", "SOL/USD"],
      entryThresholdPct: Number(params.entry_threshold_pct),
      exitStopPct: Number(params.exit_stop_pct),
      exitTakePct: Number(params.exit_take_pct),
      positionSizePct: Number(params.position_size_pct),
      maxOpenPositions: params.max_open_positions,
      minEntryIntervalHours: params.min_entry_interval_hours,
      haltDayLossPct: Number(params.halt_day_loss_pct),
    };

    // Step 3: Fetch Alpaca account + positions
    const headers = {
      "APCA-API-KEY-ID": process.env.ALPACA_API_KEY!,
      "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY!,
    };

    const [accountRes, positionsRes] = await Promise.all([
      fetch(`${ALPACA_PAPER_URL}/v2/account`, { headers }),
      fetch(`${ALPACA_PAPER_URL}/v2/positions`, { headers }),
    ]);

    if (!accountRes.ok) {
      throw new Error(`Alpaca account fetch failed: ${accountRes.status}`);
    }

    const account = await accountRes.json();
    const alpacaPositions = positionsRes.ok ? await positionsRes.json() : [];

    const equity = parseFloat(account.equity);
    
    // Get start-of-day equity (from earliest snapshot today)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    
    const { data: daySnapshot } = await supabase
      .from("crypto_floor_snapshot")
      .select("equity")
      .gte("updated_at", todayStart.toISOString())
      .order("updated_at", { ascending: true })
      .limit(1)
      .single();

    const startOfDayEquity = daySnapshot ? parseFloat(daySnapshot.equity) : equity;

    // Transform Alpaca positions
    // Only manage positions in the robot's own crypto universe. The paper account also holds
    // older hand-placed stock/options positions (AMD, AAPL calls); the first live tick tried to
    // sell them as "exits". Those are not ours to touch.
    const cryptoWire = (alpacaPositions as AlpacaPositionWire[]).filter((p) => {
      const norm = p.symbol.includes("/") ? p.symbol : p.symbol.replace(/USD$/, "/USD");
      // Ignore dust (leftover sub-$1 fragments from old fills) — Alpaca rejects selling them
      // and the robot would log a fake "take profit" every tick forever.
      const notional = Math.abs(parseFloat(p.qty) * parseFloat(p.current_price));
      return config.universe.includes(norm) && notional >= 1;
    });
    const positions: Position[] = cryptoWire.map((p) => ({
      symbol: p.symbol.includes("/") ? p.symbol : p.symbol.replace(/USD$/, "/USD"), // BTCUSD → BTC/USD
      qty: parseFloat(p.qty),
      avgEntryPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      unrealizedPnl: parseFloat(p.unrealized_pl),
      unrealizedPnlPct: parseFloat(p.unrealized_plpc) * 100,
    }));

    // Step 4: Fetch 1h bars for universe
    const barsMap = new Map<string, Bar[]>();
    
    for (const symbol of config.universe) {
      const alpacaSymbol = symbol.replace("/", ""); // BTC/USD → BTCUSD
      const barsRes = await fetch(
        `${ALPACA_DATA_URL}/v1beta3/crypto/us/bars?symbols=${alpacaSymbol}&timeframe=1Hour&limit=2`,
        { headers }
      );

      if (barsRes.ok) {
        const barsData = await barsRes.json();
        const bars = barsData.bars?.[alpacaSymbol] || [];
        
        barsMap.set(
          symbol,
          (bars as AlpacaBarWire[]).map((b) => ({
            symbol,
            timestamp: b.t,
            open: b.o,
            high: b.h,
            low: b.l,
            close: b.c,
            volume: b.v,
          }))
        );
      }
    }

    // Step 5: Get recent entries (last 4h)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const { data: recentEvents } = await supabase
      .from("crypto_floor_events")
      .select("symbol, ts")
      .eq("type", "order_submitted")
      .eq("side", "buy")
      .gte("ts", fourHoursAgo.toISOString());

    const recentEntries: RecentEntry[] = ((recentEvents || []) as RecentEventWire[]).map((e) => ({
      symbol: e.symbol,
      timestamp: e.ts,
    }));

    // Step 6: Run strategy
    const state = runStrategy(
      config,
      barsMap,
      positions,
      recentEntries,
      equity,
      startOfDayEquity
    );

    // Step 7: Handle halt
    if (state.shouldHalt) {
      await supabase
        .from("crypto_floor_params")
        .update({ halted: true })
        .eq("id", 1);

      await logEvent("system", "halt", state.haltReason!, {
        dayPnlPct: state.dayPnlPct,
        equity,
        startOfDayEquity,
      });

      return NextResponse.json({
        halted: true,
        reason: state.haltReason,
        dayPnlPct: state.dayPnlPct,
      });
    }

    // Step 8: Write signal events
    for (const signal of state.signals) {
      await logEvent(
        "scout",
        "signal",
        `${signal.type}: ${signal.reason}`,
        {
          signalType: signal.type,
          symbol: signal.symbol,
          side: signal.side,
          reason: signal.reason,
          qty: signal.qty,
          currentReturn: signal.currentReturn,
          pnlPct: signal.pnlPct,
        },
        signal.symbol,
        signal.side
      );
    }

    // Step 9: Submit orders (max 3 per tick)
    const ordersSubmitted: string[] = [];
    const ordersRejected: string[] = [];

    for (const signal of state.signals.slice(0, 3)) {
      const now = new Date();
      const clientOrderId = `cf-${signal.symbol.replace("/", "")}-${signal.side}-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}`;

      // Check if order already exists
      const { data: existingEvent } = await supabase
        .from("crypto_floor_events")
        .select("order_id")
        .eq("order_id", clientOrderId)
        .single();

      if (existingEvent) {
        ordersRejected.push(`${signal.symbol} - duplicate order_id`);
        continue;
      }

      try {
        // Determine qty
        let qty: number;
        if (signal.type === "entry" && signal.qty) {
          qty = signal.qty;
        } else if (signal.type === "exit") {
          const position = positions.find((p) => p.symbol === signal.symbol);
          qty = position ? position.qty : 0;
        } else {
          throw new Error("Cannot determine qty");
        }

        // Submit to Alpaca
        const orderRes = await fetch(`${ALPACA_PAPER_URL}/v2/orders`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol: signal.symbol.replace("/", ""), // BTC/USD → BTCUSD
            qty: qty.toFixed(8),
            side: signal.side,
            type: "market",
            // Alpaca crypto accepts only gtc/ioc for time_in_force; "day" is rejected
            // ("invalid crypto time_in_force" — seen on the first live BTC/USD order).
            time_in_force: "gtc",
            client_order_id: clientOrderId,
          }),
        });

        if (!orderRes.ok) {
          const errText = await orderRes.text();
          throw new Error(`Alpaca order failed: ${errText}`);
        }

        const order = await orderRes.json();

        // Log order_submitted
        await logEvent(
          "trader",
          "order_submitted",
          `${signal.side.toUpperCase()} ${qty.toFixed(8)} ${signal.symbol}`,
          {
            alpaca_order: order,
            signal_reason: signal.reason,
          },
          signal.symbol,
          signal.side,
          qty,
          null,
          clientOrderId
        );

        ordersSubmitted.push(clientOrderId);

        // Poll for fill (once)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const orderStatusRes = await fetch(
          `${ALPACA_PAPER_URL}/v2/orders/${order.id}`,
          { headers }
        );

        if (orderStatusRes.ok) {
          const updatedOrder = await orderStatusRes.json();
          if (updatedOrder.status === "filled") {
            await logEvent(
              "trader",
              "order_filled",
              `Filled ${qty.toFixed(8)} ${signal.symbol} @ ${updatedOrder.filled_avg_price || "market"}`,
              {
                alpaca_order: updatedOrder,
                filled_qty: updatedOrder.filled_qty,
                filled_avg_price: updatedOrder.filled_avg_price,
              },
              signal.symbol,
              signal.side,
              parseFloat(updatedOrder.filled_qty),
              parseFloat(updatedOrder.filled_avg_price || "0"),
              clientOrderId
            );
          }
        }
      } catch (errUnknown: unknown) {
      const err = errUnknown instanceof Error ? errUnknown : new Error(String(errUnknown));
        await logEvent(
          "trader",
          "order_rejected",
          `${signal.symbol}: ${err.message}`,
          {
            error: err.message,
            signal,
          },
          signal.symbol,
          signal.side
        );
        ordersRejected.push(`${signal.symbol} - ${err.message}`);
      }
    }

    // Step 10: Write snapshot
    await supabase.from("crypto_floor_snapshot").insert({
      cash: parseFloat(account.cash),
      portfolio_value: parseFloat(account.portfolio_value),
      equity: parseFloat(account.equity),
      positions: alpacaPositions,
      orders: [],
      fetched_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      signals: state.signals.length,
      ordersSubmitted: ordersSubmitted.length,
      ordersRejected: ordersRejected.length,
      equity,
      dayPnlPct: state.dayPnlPct,
    });
  } catch (errUnknown: unknown) {
      const err = errUnknown instanceof Error ? errUnknown : new Error(String(errUnknown));
    await logEvent("system", "error", err.message, { stack: err.stack });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function logEvent(
  agentRole: string,
  type: string,
  title: string,
  payload: Record<string, unknown>,
  symbol?: string | null,
  side?: string | null,
  qty?: number | null,
  price?: number | null,
  orderId?: string | null,
  strategy: string | null = "momentum-v1"
) {
  // Service-role insert through PostgREST. The previous version POSTed hand-built SQL to the
  // Supabase *Management* API with the service-role key — wrong API, wrong credential — so every
  // write 401'd and was swallowed: the first live tick submitted an order and left no record.
  try {
    const db = createCryptoFloorDb();
    if (!db) {
      console.error("logEvent: Crypto Floor DB not configured");
      return;
    }
    const { error } = await db.from("crypto_floor_events").insert({
      ts: new Date().toISOString(),
      agent_role: agentRole,
      type,
      symbol: symbol ?? null,
      side: side ?? null,
      qty: qty ?? null,
      price: price ?? null,
      payload: { title, ...payload },
      order_id: orderId ?? null,
      strategy,
    });
    if (error) console.error("logEvent insert failed:", error.message, { type, symbol });
  } catch (err) {
    console.error("Failed to log event:", err);
  }
}
