import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { allowedEmail } from "@/lib/env";
import { summarizeLedger } from "@/headquarters/normalize";
export const runtime = "nodejs";
export async function GET() {
  const auth = await createServerSupabase();
  const user = auth ? (await auth.auth.getUser()).data.user : null;
  if (!user || user.email?.toLowerCase() !== allowedEmail().toLowerCase())
    return NextResponse.json(
      { error: "Sign in to view private tasks and financial records." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const db = createServiceSupabase();
  if (!db)
    return NextResponse.json(
      { error: "Operations database unavailable" },
      { status: 503 },
    );
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  since.setUTCHours(0, 0, 0, 0);
  const [tasks, sales, expenses] = await Promise.all([
    db
      .from("agent_tasks")
      .select("id,title,status,agent_id,created_at")
      .in("status", [
        "queued",
        "working",
        "running",
        "waiting_approval",
        "failed",
      ])
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("sales")
      .select("created_at,amount,currency")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000),
    db
      .from("expenses")
      .select("created_at,amount,payload")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  const summary = summarizeLedger(sales.data ?? [], expenses.data ?? [], 30);
  const truncated =
    (sales.data?.length ?? 0) >= 1000 || (expenses.data?.length ?? 0) >= 1000;
  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      authenticated: true,
      tasksAvailable: !tasks.error,
      tasks: (tasks.data ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        agentId: t.agent_id,
        createdAt: t.created_at,
      })),
      finance: {
        ...summary,
        revenue: sales.error || truncated ? null : summary.revenue,
        expenses: expenses.error || truncated ? null : summary.expenses,
        net:
          sales.error ||
          expenses.error ||
          truncated ||
          summary.excludedCurrencies
            ? null
            : summary.net,
        points:
          sales.error || expenses.error || truncated ? [] : summary.points,
        truncated,
      },
      notice: truncated
        ? "Ledger exceeds the current query limit; totals withheld."
        : sales.error || expenses.error
          ? "Some ledger tables are unavailable."
          : summary.excludedCurrencies
            ? "Entries without an explicit USD currency are excluded."
            : "Recorded USD ledger only; not proof that every company is reconciled.",
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
