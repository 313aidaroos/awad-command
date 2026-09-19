import { NextResponse } from "next/server";

/** Honest engine board. Never returns secrets or fake fills. */
export const runtime = "nodejs";

export async function GET() {
  const venue = process.env.TRADE_VENUE ?? "";
  const mode = process.env.TRADE_MODE ?? "";
  const hasKey = Boolean(process.env.TRADE_API_KEY?.trim());
  const hasSecret = Boolean(process.env.TRADE_API_SECRET?.trim());
  const paperReady =
    mode === "paper" && hasKey && hasSecret && venue.includes("coinbase");
  return NextResponse.json({
    engine: paperReady ? "KEYS_PRESENT" : "OFFLINE",
    mode: mode || "unset",
    venue: venue || "unset",
    keys: hasKey && hasSecret ? "present" : "missing",
    liveTrading: false,
    note: paperReady
      ? "Paper keys are on. Worker loop not started."
      : "Waiting on Coinbase sandbox keys in TRADE_*. Floor stays SAMPLE.",
  });
}
