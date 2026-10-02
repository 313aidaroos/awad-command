import { NextResponse } from "next/server";
import { z } from "zod";
import { runAgentChat } from "@/lib/crypto-floor/agentChat";
import { AlpacaClient, floorAlpacaConfig } from "@/lib/crypto-floor/alpaca";
import { createCryptoFloorDb } from "@/lib/crypto-floor/db";
import { LabError } from "@/lib/crypto-floor/lab";
import { ownerEmail, sameOrigin } from "@/lib/crypto-floor/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const threadSchema = z.enum(["floor", "samurai", "neon", "orbit", "phantom"]);
const headers = { "Cache-Control": "no-store" };

/** OWNER: conversation history for a thread ('floor' or a desk). */
export async function GET(request: Request) {
  if (!(await ownerEmail())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401, headers });
  const thread = threadSchema.safeParse(new URL(request.url).searchParams.get("thread") ?? "floor");
  if (!thread.success) return NextResponse.json({ error: "Unknown thread." }, { status: 400, headers });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ error: "Crypto Floor database is not configured." }, { status: 503, headers });
  const { data, error } = await db
    .from("crypto_floor_messages")
    .select("id,created_at,agent,role,content,meta")
    .eq("thread", thread.data)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers });
  return NextResponse.json({ messages: (data ?? []).reverse() }, { headers });
}

const postSchema = z.object({
  thread: threadSchema,
  agent: z.string().max(20).optional().nullable(),
  message: z.string().trim().min(1).max(4000),
  requestId: z.string().uuid(),
});

/** OWNER: send a message to a desk agent / the desk leads and get the reply. */
export async function POST(request: Request) {
  if (!(await ownerEmail())) return NextResponse.json({ error: "Owner sign-in required." }, { status: 401, headers });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers });
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a desk and type a message." }, { status: 400, headers });
  const db = createCryptoFloorDb();
  if (!db) return NextResponse.json({ error: "Crypto Floor database is not configured." }, { status: 503, headers });

  // Same requestId twice (double tap / retry) → return the recorded reply instead of asking again.
  const dup = await db
    .from("crypto_floor_messages")
    .select("role,content,agent")
    .eq("thread", parsed.data.thread)
    .contains("meta", { requestId: parsed.data.requestId })
    .order("created_at", { ascending: true });
  const recorded = (dup.data ?? []).find((m) => m.role === "agent");
  if (recorded) return NextResponse.json({ reply: recorded.content, agent: recorded.agent }, { headers });
  if ((dup.data ?? []).length) return NextResponse.json({ error: "That message is still being answered. Refresh in a moment." }, { status: 409, headers });

  let alpaca: AlpacaClient | null = null;
  try {
    const cfg = floorAlpacaConfig();
    alpaca = cfg ? new AlpacaClient(cfg) : null;
  } catch {
    alpaca = null;
  }
  try {
    const r = await runAgentChat({ db, alpaca, thread: parsed.data.thread, agentName: parsed.data.agent, message: parsed.data.message, requestId: parsed.data.requestId });
    return NextResponse.json(r, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: err instanceof LabError ? 503 : 502, headers });
  }
}
