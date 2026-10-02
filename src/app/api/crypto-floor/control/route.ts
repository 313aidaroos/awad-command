import { NextResponse } from "next/server";
import { z } from "zod";
import { AlpacaClient, floorAlpacaConfig } from "@/lib/crypto-floor/alpaca";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import { EventLog } from "@/lib/crypto-floor/events";
import { CoinbaseClient, coinbaseConfig } from "@/lib/crypto-floor/coinbase";
import { LabError, promoteExperiment, setDeskEnabled, setDeskLive, setKillSwitch, setLiveLimits, startExperiment, stopExperiment } from "@/lib/crypto-floor/lab";
import { ownerEmail, sameOrigin } from "@/lib/crypto-floor/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deskId = z.enum(["samurai", "neon", "orbit", "phantom"]);
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("kill_on"), reason: z.string().max(300).default("") }),
  z.object({ action: z.literal("kill_off") }),
  z.object({ action: z.literal("desk_on"), desk: deskId }),
  z.object({ action: z.literal("desk_off"), desk: deskId }),
  z.object({ action: z.literal("promote"), id: z.string().uuid() }),
  z.object({ action: z.literal("live_on"), desk: deskId, confirm: z.string().max(40) }),
  z.object({ action: z.literal("live_off"), desk: deskId }),
  z.object({ action: z.literal("live_limits"), maxTotalUsd: z.number(), maxTradeUsd: z.number(), dayLossUsd: z.number() }),
  z.object({ action: z.literal("stop_experiment"), id: z.string().uuid() }),
  z.object({
    action: z.literal("start_experiment"),
    desk: deskId,
    name: z.string().trim().min(1).max(80),
    hypothesis: z.string().max(500).optional(),
    overrides: z.record(z.union([z.number(), z.boolean()])),
    days: z.number().int().min(1).max(30).optional(),
  }),
]);

/** OWNER ONLY: kill switch, desk on/off, strategy tests (start / stop / promote), REAL MONEY switch + limits (Coinbase). */
export async function POST(request: Request) {
  const by = await ownerEmail();
  if (!by) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request.", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ error: "Crypto Floor database is not configured." }, { status: 503 });
  const log = new EventLog(db);
  const body = parsed.data;
  try {
    switch (body.action) {
      case "kill_on":
      case "kill_off": {
        let alpaca: AlpacaClient | null = null;
        try {
          const cfg = floorAlpacaConfig();
          alpaca = cfg ? new AlpacaClient(cfg) : null;
        } catch {
          alpaca = null;
        }
        const r = await setKillSwitch({ db, log, alpaca, on: body.action === "kill_on", reason: body.action === "kill_on" ? body.reason : "", by });
        return NextResponse.json({ ok: true, ...r });
      }
      case "desk_on":
      case "desk_off":
        await setDeskEnabled(db, log, body.desk, body.action === "desk_on", by);
        return NextResponse.json({ ok: true });
      case "live_on":
      case "live_off": {
        let cb: CoinbaseClient | null = null;
        try {
          const cfg = coinbaseConfig();
          cb = cfg ? new CoinbaseClient(cfg) : null;
        } catch {
          cb = null;
        }
        await setDeskLive({ db, log, coinbase: cb, desk: body.desk, on: body.action === "live_on", confirm: body.action === "live_on" ? body.confirm : undefined, by });
        return NextResponse.json({ ok: true });
      }
      case "live_limits":
        await setLiveLimits(db, log, { maxTotalUsd: body.maxTotalUsd, maxTradeUsd: body.maxTradeUsd, dayLossUsd: body.dayLossUsd }, by);
        return NextResponse.json({ ok: true });
      case "promote":
        return NextResponse.json({ ok: true, ...(await promoteExperiment(db, log, body.id, by)) });
      case "stop_experiment":
        await stopExperiment(db, log, body.id, by);
        return NextResponse.json({ ok: true });
      case "start_experiment": {
        const exp = await startExperiment({ db, log, desk: body.desk, name: body.name, hypothesis: body.hypothesis, overrides: body.overrides, days: body.days, proposedBy: `Awad (${by})` });
        return NextResponse.json({ ok: true, experiment: exp });
      }
    }
  } catch (err) {
    const status = err instanceof LabError ? 400 : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status });
  }
}
