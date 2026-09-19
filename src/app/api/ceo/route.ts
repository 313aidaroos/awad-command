import { isLeadOwner } from "@/lib/leadOwner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runCeoTurn } from "@/ceo/runCeoTurn";
import { buildMissionControlSnapshot } from "@/lib/missionControl";
import { readComputerStatus } from "@/lib/computerControl";
import { anthropicModel, isAnthropicCeoEnabled } from "@/lib/env";
import { probeFleetSites, type FleetSnapshot } from "@/lib/fleetProbe";

export const runtime = "nodejs";

const ContextSchema = z.object({
  dataMode: z.enum(["demo", "live"]),
  projects: z.record(z.any()),
  agents: z.record(z.any()),
  events: z.object({ buffer: z.array(z.any()), unread: z.number() }),
  approvals: z.array(z.any()),
  headquarters: z.unknown().optional(),
  fleet: z.any().optional(),
  mission: z.any().optional(),
});

const BodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  context: ContextSchema,
});

async function enrichContext(context: z.infer<typeof ContextSchema>) {
  try {
    const fleet: FleetSnapshot = {
      source: "live",
      checkedAt: Date.now(),
      sites: await probeFleetSites(),
    };
    const computer = await readComputerStatus();
    const mission = await buildMissionControlSnapshot({
      fleet,
      computer,
      cixy: {
        provider: isAnthropicCeoEnabled() ? "anthropic" : "demo",
        enabled: isAnthropicCeoEnabled(),
        model: anthropicModel(),
      },
    });
    return { ...context, dataMode: "live" as const, fleet, mission };
  } catch {
    return context;
  }
}

export async function POST(request: Request) {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Sign in as owner to speak with Cixy." },
      { status: 401 },
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const result = await runCeoTurn({
    ...parsed.data,
    context: await enrichContext(parsed.data.context),
  });
  return NextResponse.json(result);
}
