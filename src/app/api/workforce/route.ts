import { NextResponse } from "next/server";
import { z } from "zod";
import { isLeadOwner } from "@/lib/leadOwner";
import { createServiceSupabase } from "@/lib/supabase/service";
import { persistCeoTask, resolveAgentRef } from "@/lib/agentTasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Sign in as owner to see your workforce." },
      { status: 401, headers },
    );
  const db = createServiceSupabase();
  if (!db)
    return NextResponse.json(
      { error: "Agent database unavailable." },
      { status: 503, headers },
    );
  const [agents, workers] = await Promise.all([
    db
      .from("agents")
      .select("id,project_slug,name,role,objective,status,current_task")
      .limit(1000),
    db
      .from("system_status")
      .select("status,updated_at")
      .like("project_slug", "worker:%")
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);
  if (agents.error)
    return NextResponse.json(
      { error: "Could not load saved agents." },
      { status: 503, headers },
    );
  const fresh = (workers.data ?? []).filter(
    (w) => Date.now() - Date.parse(w.updated_at) < 120000,
  );
  return NextResponse.json(
    {
      agents: agents.data,
      worker: {
        connected: fresh.some((w) => w.status === "online"),
        halted: fresh.length > 0 && fresh.every((w) => w.status === "halt"),
      },
      ads: {
        meta: "Execution connection not verified",
        google: "Execution connection not verified",
      },
    },
    { headers },
  );
}
const profileSchema = z.object({
  agentId: z.string().max(150),
  objective: z.string().trim().min(10).max(3000),
});
export async function PATCH(request: Request) {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Sign in as owner to edit agents." },
      { status: 401, headers },
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Invalid origin." },
      { status: 403, headers },
    );
  const parsed = profileSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success || !resolveAgentRef(parsed.data.agentId))
    return NextResponse.json(
      { error: "Choose an agent and enter a brief of 10–3,000 characters." },
      { status: 400, headers },
    );
  const db = createServiceSupabase();
  if (!db)
    return NextResponse.json(
      { error: "Database unavailable." },
      { status: 503, headers },
    );
  const result = await db
    .from("agents")
    .update({ objective: parsed.data.objective })
    .eq("id", parsed.data.agentId)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data)
    return NextResponse.json(
      { error: "Could not save this agent. No success was confirmed." },
      { status: 503, headers },
    );
  return NextResponse.json({ saved: true, applies: "Next task" }, { headers });
}
const taskSchema = z.object({
  agentId: z.string().max(150),
  instruction: z.string().trim().min(3).max(4000),
});
export async function POST(request: Request) {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Sign in as owner to assign work." },
      { status: 401, headers },
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Invalid origin." },
      { status: 403, headers },
    );
  const parsed = taskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !resolveAgentRef(parsed.data.agentId))
    return NextResponse.json(
      { error: "Choose an agent and describe the task." },
      { status: 400, headers },
    );
  if (!createServiceSupabase())
    return NextResponse.json(
      { error: "Agent database unavailable; nothing was queued." },
      { status: 503, headers },
    );
  // This entry point queues planning work only. It does not approve external actions or spend.
  const result = await persistCeoTask({
    ...parsed.data,
    title: parsed.data.instruction.slice(0, 100),
    instruction: `Prepare a plan or draft for this request. Do not send customer messages, publish, spend, or change external systems. Identify any missing connections and required owner decisions.\n\n${parsed.data.instruction}`,
    requiresApproval: false,
    risk: "low",
    capabilities: [],
  });
  return NextResponse.json(
    result.ok && !result.demo
      ? { taskId: result.taskId, status: result.status }
      : { error: "Could not persist the task. Refresh before retrying." },
    { status: result.ok && !result.demo ? 201 : 503, headers },
  );
}
