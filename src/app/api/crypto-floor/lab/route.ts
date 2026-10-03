import { NextResponse } from "next/server";
import { z } from "zod";
import { AlpacaClient, NO_OWN_ACCOUNT_MESSAGE, floorAlpacaConfig } from "@/lib/crypto-floor/alpaca";
import { backtestLine } from "@/lib/crypto-floor/backtest";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import { LabError, backtestDesk } from "@/lib/crypto-floor/lab";
import { ownerEmail, sameOrigin } from "@/lib/crypto-floor/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
  desk: z.enum(["samurai", "neon", "orbit", "phantom", "ronin", "cycle"]),
  overrides: z.record(z.union([z.number(), z.boolean()])).default({}),
  spec: z.record(z.unknown()).optional(),
  days: z.number().int().min(3).max(90).default(30),
});

/** OWNER: backtest a desk's strategy (current settings + optional overrides) on Alpaca hourly history. */
export async function POST(request: Request) {
  if (!(await ownerEmail())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ error: "Crypto Floor database is not configured." }, { status: 503 });
  let cfg;
  try {
    cfg = floorAlpacaConfig();
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Alpaca config refused" }, { status: 503 });
  }
  if (!cfg) return NextResponse.json({ error: NO_OWN_ACCOUNT_MESSAGE }, { status: 503 });
  try {
    const r = await backtestDesk({ db, alpaca: new AlpacaClient(cfg), desk: parsed.data.desk, overrides: parsed.data.overrides, spec: parsed.data.spec, days: parsed.data.days });
    return NextResponse.json({
      ok: true,
      params: r.params,
      spec: r.spec,
      result: r.result,
      line: backtestLine(r.result),
      baseline: r.baseline ?? null,
      baselineLine: r.baseline ? backtestLine(r.baseline) : null,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Backtest failed" }, { status: err instanceof LabError ? 400 : 502 });
  }
}
